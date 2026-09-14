import { describe, expect, it } from "vitest";
import { estimateTotalCents, formatMoney, splitInstallments } from "./quote.js";

// Базові (happy path) тести. Навмисно неповні — розширення покриття
// це і є ваш перший промпт з cookbook (Task A).

describe("estimateTotalCents", () => {
  it("рахує суму без знижки", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000 })).toBe(50000);
  });

  it("застосовує знижку", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 10 })).toBe(45000);
  });

  it("нуль годин дає нуль", () => {
    expect(estimateTotalCents({ hours: 0, rateCents: 5000 })).toBe(0);
  });

  it("discountPercent = 0 не змінює суму", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 0 })).toBe(50000);
  });

  it("discountPercent = 100 обнуляє суму", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 100 })).toBe(0);
  });

  it("discountPercent не задано — як 0", () => {
    expect(estimateTotalCents({ hours: 7, rateCents: 3300 })).toBe(
      estimateTotalCents({ hours: 7, rateCents: 3300, discountPercent: 0 }),
    );
  });

  it("округлює дробовий проміжний результат знижки", () => {
    // gross = 999, discount 33% = 329.67 -> має округлитись до найближчого цента
    expect(estimateTotalCents({ hours: 1, rateCents: 999, discountPercent: 33 })).toBe(669);
  });

  it("коректно рахує дробову кількість годин", () => {
    // gross = 1.5 * 333 = 499.5 -> округлення без знижки
    expect(estimateTotalCents({ hours: 1.5, rateCents: 333 })).toBe(500);
  });

  it("кидає помилку для discountPercent поза межами 0..100", () => {
    // Реальний баг, знайдений prompts/security-review.md: discountPercent: 150
    // мовчки давав від'ємну суму замість помилки.
    expect(() => estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 150 })).toThrow(
      /discountPercent/,
    );
    expect(() => estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: -1 })).toThrow(
      /discountPercent/,
    );
  });
});

describe("splitInstallments", () => {
  it("ділить суму, що ділиться націло", () => {
    expect(splitInstallments(90000, 3)).toEqual([30000, 30000, 30000]);
  });

  it("сума частин дорівнює вихідній сумі, навіть якщо не ділиться націло", () => {
    const parts = splitInstallments(100, 3);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("кидає помилку для parts <= 0 замість крашу чи мовчазного []", () => {
    // Реальний баг: new Array(-1) кидав некерований RangeError: Invalid array length,
    // а parts=0 мовчки повертав []. Тепер обидва — явна доменна помилка.
    expect(() => splitInstallments(100, -1)).toThrow(/parts/);
    expect(() => splitInstallments(100, 0)).toThrow(/parts/);
  });

  it("кидає помилку для нецілого parts", () => {
    expect(() => splitInstallments(100, 2.5)).toThrow(/parts/);
  });
});

describe("formatMoney", () => {
  it("форматує центи", () => {
    expect(formatMoney(123450)).toBe("$1,234.50");
  });

  it("форматує нуль", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("форматує від'ємне значення", () => {
    expect(formatMoney(-500)).toBe("-$5.00");
  });
});
