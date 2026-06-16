import { describe, expect, it } from "vitest";
import type { WheelItem } from "../types";
import {
  FULL_CIRCLE,
  getClockwiseRotationDelta,
  getSelectableItems,
  getTargetRotationForSegment,
  getWeightedSegments,
  pickWeightedWinner,
} from "./wheel";

function createItem(overrides: Partial<WheelItem>): WheelItem {
  return {
    id: overrides.id ?? "item",
    text: overrides.text ?? "Item",
    weight: overrides.weight ?? 1,
    color: overrides.color ?? "#000000",
    colorClass: overrides.colorClass ?? "color-test",
    hidden: overrides.hidden ?? false,
    count: overrides.count ?? 0,
  };
}

describe("wheel utilities", () => {
  it("only treats visible positive-weight items as selectable", () => {
    const items = [
      createItem({ id: "a", weight: 1 }),
      createItem({ id: "b", weight: 0 }),
      createItem({ id: "c", weight: -1 }),
      createItem({ id: "d", weight: Number.NaN }),
      createItem({ id: "e", hidden: true, weight: 10 }),
    ];

    expect(getSelectableItems(items).map((item) => item.id)).toEqual(["a"]);
  });

  it("builds proportional weighted segments", () => {
    const [oneWeightSegment, threeWeightSegment] = getWeightedSegments([
      createItem({ id: "one", weight: 1 }),
      createItem({ id: "three", weight: 3 }),
    ]);

    expect(oneWeightSegment.startAngle).toBe(0);
    expect(oneWeightSegment.endAngle).toBeCloseTo(FULL_CIRCLE / 4);
    expect(threeWeightSegment.startAngle).toBeCloseTo(FULL_CIRCLE / 4);
    expect(threeWeightSegment.endAngle).toBeCloseTo(FULL_CIRCLE);
  });

  it("picks winners by weight with deterministic random values", () => {
    const items = [
      createItem({ id: "one", weight: 1 }),
      createItem({ id: "three", weight: 3 }),
    ];

    expect(pickWeightedWinner(items, 0)?.id).toBe("one");
    expect(pickWeightedWinner(items, 0.24)?.id).toBe("one");
    expect(pickWeightedWinner(items, 0.26)?.id).toBe("three");
    expect(pickWeightedWinner(items, 0.99)?.id).toBe("three");
  });

  it("targets the center of the selected weighted segment", () => {
    const [, threeWeightSegment] = getWeightedSegments([
      createItem({ id: "one", weight: 1 }),
      createItem({ id: "three", weight: 3 }),
    ]);

    expect(getTargetRotationForSegment(threeWeightSegment)).toBeCloseTo(
      (FULL_CIRCLE * 3) / 8,
    );
  });

  it("calculates clockwise rotation deltas from normalized rotations", () => {
    expect(getClockwiseRotationDelta(FULL_CIRCLE * 2 + 1, 2)).toBeCloseTo(1);
    expect(getClockwiseRotationDelta(5, 1)).toBeCloseTo(FULL_CIRCLE - 4);
  });
});
