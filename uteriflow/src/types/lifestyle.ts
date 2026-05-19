export interface LifestyleTip {
  id: string;
  title: string;
  summary: string;
  image_url?: string | null;
  category: string;
  read_time: number;
  created_at: string;
}
 export interface LifestyleTipDetail extends LifestyleTip {
  content: string;
}