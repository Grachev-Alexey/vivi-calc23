import { db } from "./db";
import { perks, packagePerkValues, packages } from "@shared/schema";

const DEFAULT_PERKS = [
  { name: "Скидка на абонемент", description: "Скидка от базовой стоимости", icon: "Percent", iconColor: "#F5C76A", displayOrder: 1 },
  { name: "Удобная рассрочка без процентов", description: "Рассрочка без переплат", icon: "CreditCard", iconColor: "#5B9DFF", displayOrder: 2 },
  { name: "Подарочные сеансы", description: "Бонусные сеансы при покупке курса", icon: "Gift", iconColor: "#F5C76A", displayOrder: 3 },
  { name: "Бонусные зоны за активность", description: "Бесплатные дополнительные зоны", icon: "Sparkles", iconColor: "#F5C76A", displayOrder: 4 },
  { name: "Бонусный счёт", description: "Кэшбэк на следующие покупки", icon: "Wallet", iconColor: "#5B9DFF", displayOrder: 5 },
  { name: "Гарантия возврата денег", description: "Возврат при отсутствии результата", icon: "Shield", iconColor: "#43D17A", displayOrder: 6 },
  { name: "Приоритетная запись", description: "Запись в удобное время без ожидания", icon: "Star", iconColor: "#F5C76A", displayOrder: 7 },
  { name: "Персональный мастер", description: "Закреплённый специалист", icon: "UserCheck", iconColor: "#5B9DFF", displayOrder: 8 },
];

type PerkValue = {
  packageType: "vip" | "standard" | "economy";
  valueType: "boolean" | "text" | "number";
  booleanValue?: boolean;
  textValue?: string;
  displayValue: string;
  isHighlighted?: boolean;
  isBest?: boolean;
};

const VALUES_BY_PERK_NAME: Record<string, PerkValue[]> = {
  "Скидка на абонемент": [
    { packageType: "vip", valueType: "text", textValue: "35%", displayValue: "35%", isHighlighted: true, isBest: true },
    { packageType: "standard", valueType: "text", textValue: "30%", displayValue: "30%" },
    { packageType: "economy", valueType: "text", textValue: "25%", displayValue: "25%" },
  ],
  "Удобная рассрочка без процентов": [
    { packageType: "vip", valueType: "boolean", booleanValue: true, displayValue: "✓" },
    { packageType: "standard", valueType: "boolean", booleanValue: true, displayValue: "✓" },
    { packageType: "economy", valueType: "boolean", booleanValue: true, displayValue: "✓" },
  ],
  "Подарочные сеансы": [
    { packageType: "vip", valueType: "text", textValue: "3 сеанса", displayValue: "3 сеанса", isHighlighted: true, isBest: true },
    { packageType: "standard", valueType: "text", textValue: "1 сеанс", displayValue: "1 сеанс" },
    { packageType: "economy", valueType: "boolean", booleanValue: false, displayValue: "—" },
  ],
  "Бонусные зоны за активность": [
    { packageType: "vip", valueType: "text", textValue: "Все доступные", displayValue: "Все доступные", isHighlighted: true, isBest: true },
    { packageType: "standard", valueType: "text", textValue: "1 зона", displayValue: "1 зона" },
    { packageType: "economy", valueType: "boolean", booleanValue: false, displayValue: "—" },
  ],
  "Бонусный счёт": [
    { packageType: "vip", valueType: "text", textValue: "5%", displayValue: "5%", isHighlighted: true, isBest: true },
    { packageType: "standard", valueType: "text", textValue: "3%", displayValue: "3%" },
    { packageType: "economy", valueType: "boolean", booleanValue: false, displayValue: "—" },
  ],
  "Гарантия возврата денег": [
    { packageType: "vip", valueType: "boolean", booleanValue: true, displayValue: "✓" },
    { packageType: "standard", valueType: "boolean", booleanValue: true, displayValue: "✓" },
    { packageType: "economy", valueType: "boolean", booleanValue: true, displayValue: "✓" },
  ],
  "Приоритетная запись": [
    { packageType: "vip", valueType: "boolean", booleanValue: true, displayValue: "✓", isHighlighted: true, isBest: true },
    { packageType: "standard", valueType: "boolean", booleanValue: false, displayValue: "—" },
    { packageType: "economy", valueType: "boolean", booleanValue: false, displayValue: "—" },
  ],
  "Персональный мастер": [
    { packageType: "vip", valueType: "boolean", booleanValue: true, displayValue: "✓", isHighlighted: true, isBest: true },
    { packageType: "standard", valueType: "boolean", booleanValue: false, displayValue: "—" },
    { packageType: "economy", valueType: "boolean", booleanValue: false, displayValue: "—" },
  ],
};

export async function seedPerksIfEmpty(): Promise<void> {
  try {
    const existing = await db.select().from(perks).limit(1);
    if (existing.length > 0) return;

    // Make sure the referenced packages exist; otherwise the FK insert below
    // will fail and abort the whole seed.
    const existingPackages = await db.select({ type: packages.type }).from(packages);
    const presentTypes = new Set(existingPackages.map((p) => p.type));
    const requiredTypes = ["vip", "standard", "economy"];
    const missing = requiredTypes.filter((t) => !presentTypes.has(t));
    if (missing.length > 0) {
      console.warn(
        `⏭  Skipping perks seed — missing package types in DB: ${missing.join(", ")}`,
      );
      return;
    }

    console.log("🌱 Seeding default perks (table is empty)...");

    const inserted = await db.insert(perks).values(DEFAULT_PERKS).returning();
    const byName = new Map(inserted.map((p) => [p.name, p.id]));

    const valueRows: any[] = [];
    for (const perk of inserted) {
      const values = VALUES_BY_PERK_NAME[perk.name] || [];
      for (const v of values) {
        valueRows.push({
          packageType: v.packageType,
          perkId: perk.id,
          valueType: v.valueType,
          booleanValue: v.booleanValue ?? null,
          textValue: v.textValue ?? null,
          displayValue: v.displayValue,
          isHighlighted: v.isHighlighted ?? false,
          isBest: v.isBest ?? false,
          isActive: true,
        });
      }
    }

    if (valueRows.length > 0) {
      await db.insert(packagePerkValues).values(valueRows);
    }

    console.log(`✅ Seeded ${inserted.length} perks and ${valueRows.length} package values.`);
  } catch (err) {
    console.error("Failed to seed perks:", err);
  }
}
