// 发布页“选择示例照片”素材（成员 C 消费）。全部为本地 SVG，离线可用。
import elevatorPhoto from '../assets/sample-photo-elevator.svg';
import parkingPhoto from '../assets/sample-photo-parking.svg';
import signagePhoto from '../assets/sample-photo-signage.svg';

export interface SamplePhoto {
  id: string;
  label: string;
  src: string;
}

export const SAMPLE_PHOTOS: readonly SamplePhoto[] = [
  { id: 'sample-elevator', label: '电梯按钮照片', src: elevatorPhoto },
  { id: 'sample-parking', label: '无障碍停车位照片', src: parkingPhoto },
  { id: 'sample-signage', label: '走廊导向标识照片', src: signagePhoto },
] as const;
