import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";

async function main() {
  // Dynamic imports so env vars are loaded first
  const { db } = await import("../src/server/db");
  const { users, items } = await import("../src/server/db/schema");
  const { generateEmbedding } = await import("../src/server/ai/embeddings");

  console.log("Seeding…");

  const adminHash = await bcrypt.hash("admin1234", 10);
  const memberHash = await bcrypt.hash("member1234", 10);

  const [admin] = await db
    .insert(users)
    .values([
      {
        name: "Library Admin",
        email: "admin@vinylith.dev",
        passwordHash: adminHash,
        role: "admin",
      },
      {
        name: "Jane Member",
        email: "jane@vinylith.dev",
        passwordHash: memberHash,
        role: "member",
      },
    ])
    .returning();

  const seedItems = [
    {
      type: "vinyl" as const,
      title: "Kind of Blue",
      description: "Miles Davis' 1959 modal jazz masterpiece on 180g vinyl.",
      condition: "near_mint" as const,
      attributes: {
        artist: "Miles Davis",
        label: "Columbia",
        year: 1959,
        genre: "jazz",
        rpm: 33,
      },
    },
    {
      type: "vinyl" as const,
      title: "Dark Side of the Moon",
      description:
        "Pink Floyd's 1973 concept album, original pressing, slight sleeve wear.",
      condition: "good" as const,
      attributes: {
        artist: "Pink Floyd",
        label: "Harvest",
        year: 1973,
        genre: "progressive rock",
        rpm: 33,
      },
    },
    {
      type: "book" as const,
      title: "The Left Hand of Darkness",
      description:
        "Ursula K. Le Guin's groundbreaking sci-fi novel about gender and politics.",
      condition: "mint" as const,
      attributes: {
        isbn: "9780441478125",
        author: "Ursula K. Le Guin",
        genre: "science fiction",
        year: 1969,
      },
    },
    {
      type: "toy" as const,
      title: "Wooden Train Set",
      description: "Handcrafted wooden train with 12 pieces, for toddlers.",
      condition: "good" as const,
      attributes: {
        ageRating: "3+",
        manufacturer: "Brio",
        material: "wood",
        category: "vehicles",
      },
    },
    {
      type: "notebook" as const,
      title: "Leuchtturm1917 A5 Dotted",
      description: "Classic A5 hardcover notebook, 251 numbered pages.",
      condition: "mint" as const,
      attributes: {
        pages: 251,
        ruling: "dotted",
        brand: "Leuchtturm1917",
        size: "A5",
      },
    },
  ];

  for (const item of seedItems) {
    const embedding = await generateEmbedding(
      `${item.type} | ${item.title} | ${item.description} | ${Object.entries(
        item.attributes
      )
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`
    );
    await db.insert(items).values({ ...item, embedding });
  }

  console.log(`✓ Seeded ${seedItems.length} items. Admin: ${admin?.email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
