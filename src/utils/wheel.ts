import type { WheelItem } from "../types";

export const FULL_CIRCLE = Math.PI * 2;

export type WheelSegment = {
  item: WheelItem;
  startAngle: number;
  endAngle: number;
};

export function getSelectableItems(items: WheelItem[]) {
  return items.filter(
    (item) => !item.hidden && Number.isFinite(item.weight) && item.weight > 0,
  );
}

export function getWeightedSegments(items: WheelItem[]): WheelSegment[] {
  const selectableItems = getSelectableItems(items);
  const totalWeight = selectableItems.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  if (totalWeight <= 0) {
    return [];
  }

  let currentAngle = 0;

  return selectableItems.map((item) => {
    const sliceAngle = (item.weight / totalWeight) * FULL_CIRCLE;
    const segment = {
      item,
      startAngle: currentAngle,
      endAngle: currentAngle + sliceAngle,
    };

    currentAngle += sliceAngle;

    return segment;
  });
}

export function pickWeightedWinner(
  items: WheelItem[],
  randomValue = Math.random(),
): WheelItem | null {
  const weightedItems = getSelectableItems(items);
  if (weightedItems.length === 0) return null;

  const totalWeight = weightedItems.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  let remainingWeight = randomValue * totalWeight;

  for (const item of weightedItems) {
    remainingWeight -= item.weight;
    if (remainingWeight <= 0) return item;
  }

  return weightedItems[weightedItems.length - 1];
}

export function getSegmentCenter(segment: WheelSegment) {
  return segment.startAngle + (segment.endAngle - segment.startAngle) / 2;
}

export function getTargetRotationForSegment(segment: WheelSegment) {
  return (FULL_CIRCLE - getSegmentCenter(segment)) % FULL_CIRCLE;
}

export function normalizeRotation(rotation: number) {
  return ((rotation % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
}

export function getClockwiseRotationDelta(
  currentRotation: number,
  targetRotation: number,
) {
  return (
    targetRotation - normalizeRotation(currentRotation) + FULL_CIRCLE
  ) % FULL_CIRCLE;
}
