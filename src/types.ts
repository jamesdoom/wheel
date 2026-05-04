export type WheelMode = "normal" | "elimination" | "accumulation";

export type WheelItem = {
  id: string;
  text: string;
  weight: number;
  color: string;
  colorClass: string;
  hidden: boolean;
  count: number;
};
