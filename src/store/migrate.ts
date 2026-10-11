import type { AppData } from '../types';
import { STORAGE_VERSION } from '../app/config/storage';
import campusJourneyPhoto from '../assets/generated-campus-journey.png';
import rampReportPhoto from '../assets/generated-ramp-report.png';

/** 仅升级内置演示地点与素材，保留用户记录及自定义坐标。 */
export function migrateStoredData(value: unknown, seed: AppData): AppData {
  if (typeof value !== 'object' || value === null) return seed;
  const data = value as Partial<AppData> & { schemaVersion?: number };
  const arrays = ['places', 'posts', 'observations', 'timeline', 'pointRecords', 'demoUsers', 'routes'] as const;
  if (arrays.some((key) => !Array.isArray(data[key])) ||
      !data.demoUsers?.length || typeof data.currentUserId !== 'string' ||
      !data.preferences || !data.privacySettings || !data.navigation) return seed;

  const knownPlaces = new Map(seed.places.map((place) => [place.id, place]));
  const deletedPostIds = Array.isArray(data.deletedPostIds) ? data.deletedPostIds.filter((id) => typeof id === 'string') : [];
  const demoUsers = [...data.demoUsers!];
  for (const user of seed.demoUsers.filter((item) => item.role === 'disabled_person')) {
    if (!demoUsers.some((item) => item.userId === user.userId)) demoUsers.push({ ...user });
  }
  const places = data.places!.map((place) => {
    const known = knownPlaces.get(place.id);
    const legacyNames: Record<string, string[]> = {
      'place-library-east': ['图书馆东门', '琳恩图书馆'], 'place-canteen': ['第一食堂侧门'],
      'place-teaching-3': ['第三教学楼'], 'place-gym': ['体育馆', '风雨操场'],
      'place-student-center': ['学生活动中心'],
    };
    const namedPlace = known && legacyNames[place.id]?.includes(place.name)
      ? { ...place, name: known.name, category: known.category } : place;
    const migratedPlace = !place.sceneImage && known?.sceneImage
      ? { ...namedPlace, sceneImage: known.sceneImage } : namedPlace;
    const coordinates = place.coordinates;
    const legacyCoordinates: Record<string, [number, number]> = {
      'place-library-east': [113.99337, 22.59796], 'place-canteen': [113.99289, 22.59951],
      'place-teaching-3': [113.9945, 22.598], 'place-gym': [113.99922, 22.60466],
      'place-student-center': [113.9936, 22.6019],
    };
    const oldCoordinate = legacyCoordinates[place.id];
    const hasOldSeedCoordinates = oldCoordinate && coordinates?.lng === oldCoordinate[0] &&
      coordinates?.lat === oldCoordinate[1];
    if (known && (hasOldSeedCoordinates || !Number.isFinite(coordinates?.lat) || !Number.isFinite(coordinates?.lng))) {
      return { ...migratedPlace, coordinates: { ...coordinates, lat: known.coordinates.lat, lng: known.coordinates.lng } };
    }
    return migratedPlace;
  });
  // 只升级内置演示素材，保留用户上传的照片与编辑过的其他字段。
  const photoSources: Record<string, string> = {
    'photo-ramp-occupied': 'post-facility-ramp',
    'photo-tactile-blocked': 'post-facility-tactile',
    'photo-restroom-ok': 'post-facility-restroom',
    'article-ramp-standard': 'post-article-ramp',
    'article-tactile': 'post-article-tactile',
    'tool-map-compare': 'post-tool-map',
    'tool-elevator-check': 'post-tool-elevator',
    'experience-metro': 'post-experience-metro',
  };
  const replacements = new Map(Object.entries(photoSources).map(([name, postId]) =>
    [name, seed.posts.find((post) => post.id === postId)?.images[0]]));
  replacements.set('sample-photo-elevator', seed.observations.find((item) => item.id === 'obs-elevator-004')?.photo);
  const replaceDemoPhoto = (image: string) => {
    // 只认本地内置素材路径；不会替换远程图、blob 或用户上传的 data URL。
    if (!image.startsWith('/src/assets/') && !image.startsWith('/assets/')) return image;
    const basename = image.split('/').at(-1) ?? '';
    for (const [name, replacement] of replacements) {
      if (replacement && new RegExp(`^${name}(?:-[\\w-]+)?\\.svg(?:\\?.*)?$`).test(basename)) return replacement;
    }
    return image;
  };
  // 本机发布验收时复用了坡道示例，按准确帖子 ID 换独立封面，不重置用户记录。
  const demoCoverOverrides: Record<string, string> = {
    'post-mv3g9jfp-9iawgp': campusJourneyPhoto,
    'post-mv3g90hb-c7o3ju': rampReportPhoto,
  };
  const sharedRamp = seed.posts.find((post) => post.id === 'post-facility-ramp')?.images[0];
  const observationCovers = new Map<string, string>();
  const posts = data.posts!.map((post) => {
    const images = post.images.map(replaceDemoPhoto);
    const cover = demoCoverOverrides[post.id];
    if (cover && sharedRamp && images[0] === sharedRamp) {
      images[0] = cover;
      if (post.observationId) observationCovers.set(post.observationId, cover);
    }
    return { ...post, images };
  });
  const observations = data.observations!.map((item) => {
    const photo = replaceDemoPhoto(item.photo);
    return { ...item, photo: photo === sharedRamp ? (observationCovers.get(item.id) ?? photo) : photo };
  });
  const timeline = data.timeline!.map((event) => ({ ...event }));

  // v5：把10栋测试观察加入所有浏览器的既有快照；若用户已在附近创建同名档案或同内容观察则复用，避免重复。
  const seedTestPlace = seed.places.find((place) => place.id === 'place-canteen-2-test');
  const seedTestObservation = seed.observations.find((item) => item.id === 'obs-canteen-2-test');
  const seedTestPost = seed.posts.find((post) => post.id === 'post-canteen-2-test');
  const seedTestTimeline = seed.timeline.find((event) => event.id === 'tl-canteen-2-test');
  if (seedTestPlace && seedTestObservation && seedTestPost && seedTestTimeline && !deletedPostIds.includes(seedTestPost.id)) {
    const normalize = (name: string) => name.replace(/南方科技大学|[\s()（）·-]/g, '');
    const targetPlace = places.find((place) => {
      if (place.id === seedTestPlace.id) return true;
      if (normalize(place.name) !== normalize(seedTestPlace.name)) return false;
      const lat = place.coordinates.lat;
      const lng = place.coordinates.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const north = (lat! - seedTestPlace.coordinates.lat!) * 111320;
      const east = (lng! - seedTestPlace.coordinates.lng!) * 111320 * Math.cos(lat! * Math.PI / 180);
      return Math.hypot(north, east) <= 100;
    }) ?? structuredClone(seedTestPlace);
    if (!places.some((place) => place.id === targetPlace.id)) places.push(targetPlace);
    const existingTest = observations.find((item) => item.id === seedTestObservation.id ||
      item.description.startsWith('模拟测试观察：位置位于10栋（第二学生餐厅）南侧最底边'));
    if (!existingTest) {
      const observation = { ...structuredClone(seedTestObservation), placeId: targetPlace.id };
      const post = { ...structuredClone(seedTestPost), placeId: targetPlace.id, observationId: observation.id };
      observations.unshift(observation);
      posts.unshift(post);
      timeline.unshift({ ...structuredClone(seedTestTimeline), placeId: targetPlace.id, observationId: observation.id });
      if (!targetPlace.observationIds.includes(observation.id)) targetPlace.observationIds.unshift(observation.id);
      targetPlace.currentStatus = 'pending';
    }
  }
  return { ...data, deletedPostIds, demoUsers, places, posts, observations, timeline, helpRequests: Array.isArray(data.helpRequests) ? data.helpRequests : [], redemptions: Array.isArray(data.redemptions) ? data.redemptions : [], schemaVersion: STORAGE_VERSION } as AppData;
}
