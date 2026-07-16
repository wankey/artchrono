import { test, expect } from "@playwright/test";

test.describe("App smoke tests", () => {
  test("首页加载并显示登录页面", async ({ page }) => {
    await page.goto("/");
    // 未登录状态下看到登录页
    await expect(page.getByText("艺时纪", { exact: true })).toBeVisible();
    await expect(page.locator("text=邮箱")).toBeVisible();
    await expect(page.locator("text=密码")).toBeVisible();
  });

  test("页面标题正确", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("艺时纪");
  });

  test("登录页有注册/登录模式切换", async ({ page }) => {
    await page.goto("/");
    // 默认是登录模式
    await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
    // 点击切换注册
    await page.getByRole("button", { name: /没有账号/ }).click();
    await expect(page.getByRole("button", { name: "注册" })).toBeVisible();
  });
});
