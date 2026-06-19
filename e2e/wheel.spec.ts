import { expect, test } from "@playwright/test";

test("spins, records history, and restores a saved wheel", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Spin the wheel" }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 6_000 });
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("1 spins")).toBeVisible();

  await page.getByRole("button", { name: "Manage Wheels" }).click();
  await page.getByRole("textbox", { name: "Saved wheel name" }).fill(
    "Dinner Choices",
  );
  await page.getByRole("button", { name: "Save Current" }).click();
  await expect(
    page.getByRole("combobox", { name: "Select a saved wheel" }),
  ).toHaveValue(/.+/);

  await page.reload();
  await page.getByRole("button", { name: "Manage Wheels" }).click();
  await expect(
    page.getByRole("option", { name: "Dinner Choices" }),
  ).toBeAttached();
  await expect(page.getByText("1 spins")).toBeVisible();
});
