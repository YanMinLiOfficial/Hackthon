// 发布页示例照片：复用本地 AI 生成高保真配图，离线可用，非现场采集。
import elevatorPhoto from '../assets/generated-tool-elevator.png';
import tactilePhoto from '../assets/generated-tactile.png';
import restroomPhoto from '../assets/generated-restroom.png';
import rampPhoto from '../assets/generated-ramp.png';

export interface SamplePhoto {
  id: string;
  label: string;
  src: string;
}

export const SAMPLE_PHOTOS: readonly SamplePhoto[] = [
  { id: 'sample-ramp', label: '坡道被共享单车占用', src: rampPhoto },
  { id: 'sample-tactile', label: '盲道被纸箱与路锥阻挡', src: tactilePhoto },
  { id: 'sample-restroom', label: '无障碍卫生间场景', src: restroomPhoto },
  { id: 'sample-elevator', label: '电梯现场记录场景', src: elevatorPhoto },
] as const;
