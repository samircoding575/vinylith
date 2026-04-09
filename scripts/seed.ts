import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";

async function main() {
  const { db } = await import("../src/server/db");
  const { users, items } = await import("../src/server/db/schema");
  const { generateEmbedding } = await import("../src/server/ai/embeddings");

  console.log("Seeding… (first run downloads the ~23 MB embedding model)");

  // ── Users ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 10);
  const memberHash = await bcrypt.hash("member1234", 10);

  await db.insert(users).values([
    { name: "Library Admin", email: "admin@vinylith.dev", passwordHash: adminHash, role: "admin" },
    { name: "Jane Member",   email: "jane@vinylith.dev",  passwordHash: memberHash, role: "member" },
  ]).onConflictDoNothing();

  // ── Items ──────────────────────────────────────────────────────────
  const seedItems = [
    // ── Vinyl ──────────────────────────────────────────────────────
    { type: "vinyl" as const, title: "Kind of Blue",
      description: "Miles Davis' 1959 modal jazz masterpiece. The best-selling jazz album of all time.",
      condition: "near_mint" as const,
      attributes: { artist: "Miles Davis", label: "Columbia", year: 1959, genre: "jazz", rpm: 33 } },

    { type: "vinyl" as const, title: "Dark Side of the Moon",
      description: "Pink Floyd's 1973 concept album exploring conflict, greed, time and mental illness.",
      condition: "good" as const,
      attributes: { artist: "Pink Floyd", label: "Harvest", year: 1973, genre: "progressive rock", rpm: 33 } },

    { type: "vinyl" as const, title: "Rumours",
      description: "Fleetwood Mac's landmark 1977 soft rock album featuring Go Your Own Way.",
      condition: "good" as const,
      attributes: { artist: "Fleetwood Mac", label: "Warner Bros.", year: 1977, genre: "soft rock", rpm: 33 } },

    { type: "vinyl" as const, title: "Blue Train",
      description: "John Coltrane's hard bop masterpiece on Blue Note Records, 1957 original pressing.",
      condition: "fair" as const,
      attributes: { artist: "John Coltrane", label: "Blue Note", year: 1957, genre: "jazz", rpm: 33 } },

    { type: "vinyl" as const, title: "Led Zeppelin IV",
      description: "Untitled 1971 album featuring Stairway to Heaven. Atlantic Records pressing.",
      condition: "good" as const,
      attributes: { artist: "Led Zeppelin", label: "Atlantic", year: 1971, genre: "hard rock", rpm: 33 } },

    { type: "vinyl" as const, title: "Innervisions",
      description: "Stevie Wonder's 1973 politically charged soul and R&B classic.",
      condition: "near_mint" as const,
      attributes: { artist: "Stevie Wonder", label: "Tamla", year: 1973, genre: "soul", rpm: 33 } },

    { type: "vinyl" as const, title: "Nevermind",
      description: "Nirvana's breakthrough 1991 grunge album. Sealed original pressing.",
      condition: "mint" as const,
      attributes: { artist: "Nirvana", label: "DGC Records", year: 1991, genre: "grunge", rpm: 33 } },

    { type: "vinyl" as const, title: "Purple Rain",
      description: "Prince's iconic 1984 soundtrack album, sealed original pressing.",
      condition: "mint" as const,
      attributes: { artist: "Prince", label: "Warner Bros.", year: 1984, genre: "funk pop", rpm: 33 } },

    { type: "vinyl" as const, title: "Exile on Main St.",
      description: "Rolling Stones' sprawling 1972 double album, recorded in a French villa.",
      condition: "good" as const,
      attributes: { artist: "The Rolling Stones", label: "Rolling Stones Records", year: 1972, genre: "rock", rpm: 33 } },

    { type: "vinyl" as const, title: "Maiden Voyage",
      description: "Herbie Hancock's 1965 post-bop jazz landmark on Blue Note.",
      condition: "near_mint" as const,
      attributes: { artist: "Herbie Hancock", label: "Blue Note", year: 1965, genre: "jazz", rpm: 33 } },

    { type: "vinyl" as const, title: "What's Going On",
      description: "Marvin Gaye's 1971 concept album addressing poverty, drug abuse and the Vietnam War.",
      condition: "near_mint" as const,
      attributes: { artist: "Marvin Gaye", label: "Tamla", year: 1971, genre: "soul", rpm: 33 } },

    { type: "vinyl" as const, title: "Abbey Road",
      description: "The Beatles' 1969 swansong album featuring the iconic zebra-crossing cover.",
      condition: "good" as const,
      attributes: { artist: "The Beatles", label: "Apple Records", year: 1969, genre: "rock", rpm: 33 } },

    // ── Books ───────────────────────────────────────────────────────
    { type: "book" as const, title: "The Left Hand of Darkness",
      description: "Ursula K. Le Guin's groundbreaking sci-fi novel exploring gender and politics on an alien world.",
      condition: "mint" as const,
      attributes: { isbn: "9780441478125", author: "Ursula K. Le Guin", genre: "science fiction", year: 1969, publisher: "Ace" } },

    { type: "book" as const, title: "Dune",
      description: "Frank Herbert's epic sci-fi saga set on the desert planet Arrakis. A must-read classic.",
      condition: "good" as const,
      attributes: { isbn: "9780441013593", author: "Frank Herbert", genre: "science fiction", year: 1965, publisher: "Chilton Books" } },

    { type: "book" as const, title: "One Hundred Years of Solitude",
      description: "Gabriel García Márquez's Nobel-winning magical realism saga of the Buendía family.",
      condition: "good" as const,
      attributes: { isbn: "9780060883287", author: "Gabriel García Márquez", genre: "magical realism", year: 1967, publisher: "Harper Perennial" } },

    { type: "book" as const, title: "The Name of the Wind",
      description: "Patrick Rothfuss's lyrical fantasy following the legend of Kvothe the Arcanist.",
      condition: "near_mint" as const,
      attributes: { isbn: "9780756404079", author: "Patrick Rothfuss", genre: "fantasy", year: 2007, publisher: "DAW Books" } },

    { type: "book" as const, title: "The Hitchhiker's Guide to the Galaxy",
      description: "Douglas Adams' brilliantly funny sci-fi comedy about the end of the Earth and the answer 42.",
      condition: "near_mint" as const,
      attributes: { isbn: "9780345391803", author: "Douglas Adams", genre: "science fiction comedy", year: 1979, publisher: "Pan Books" } },

    { type: "book" as const, title: "The Design of Everyday Things",
      description: "Don Norman's seminal book on user-centred design — essential for any designer or engineer.",
      condition: "mint" as const,
      attributes: { isbn: "9780465050659", author: "Don Norman", genre: "design non-fiction", year: 1988, publisher: "Basic Books" } },

    { type: "book" as const, title: "Thinking, Fast and Slow",
      description: "Daniel Kahneman's exploration of the two systems that drive the way we think.",
      condition: "good" as const,
      attributes: { isbn: "9780374533557", author: "Daniel Kahneman", genre: "psychology", year: 2011, publisher: "Farrar Straus Giroux" } },

    { type: "book" as const, title: "Invisible Man",
      description: "Ralph Ellison's 1952 novel exploring Black identity and racism in mid-20th century America.",
      condition: "good" as const,
      attributes: { isbn: "9780679732761", author: "Ralph Ellison", genre: "literary fiction", year: 1952, publisher: "Random House" } },

    { type: "book" as const, title: "Sapiens: A Brief History of Humankind",
      description: "Yuval Noah Harari's sweeping history of the human species from Stone Age to the present.",
      condition: "mint" as const,
      attributes: { isbn: "9780062316097", author: "Yuval Noah Harari", genre: "history non-fiction", year: 2011, publisher: "Harvill Secker" } },

    // ── Toys ────────────────────────────────────────────────────────
    { type: "toy" as const, title: "Wooden Train Set",
      description: "Handcrafted 30-piece wooden train with bridges and stations. Safe for toddlers.",
      condition: "good" as const,
      attributes: { ageRating: "3+", manufacturer: "Brio", material: "wood", category: "vehicles" } },

    { type: "toy" as const, title: "LEGO Classic Brick Box 10698",
      description: "900-piece classic LEGO brick set for open-ended creative building.",
      condition: "good" as const,
      attributes: { ageRating: "4+", manufacturer: "LEGO", material: "plastic", category: "construction" } },

    { type: "toy" as const, title: "Magnetic Tiles 100-piece Set",
      description: "Colourful magnetic tiles for building 3D structures. Develops spatial reasoning.",
      condition: "near_mint" as const,
      attributes: { ageRating: "3+", manufacturer: "Picasso Tiles", material: "plastic magnet", category: "construction" } },

    { type: "toy" as const, title: "Wooden Chess Set",
      description: "Classic weighted wooden chess pieces with a roll-up board. For beginners to advanced players.",
      condition: "good" as const,
      attributes: { ageRating: "6+", manufacturer: "WorldWise Imports", material: "wood", category: "strategy games" } },

    { type: "toy" as const, title: "Rubik's Cube 3x3",
      description: "The original Rubik's Cube. Classic puzzle toy for all ages.",
      condition: "good" as const,
      attributes: { ageRating: "8+", manufacturer: "Rubik's", material: "plastic", category: "puzzle" } },

    { type: "toy" as const, title: "Crystal Growing Science Kit",
      description: "Grow 6 types of colourful crystals with lab manual and magnifier. Great STEM activity.",
      condition: "mint" as const,
      attributes: { ageRating: "10+", manufacturer: "National Geographic", material: "various", category: "science STEM" } },

    { type: "toy" as const, title: "Dinosaur Excavation Kit",
      description: "Dig up and assemble a T-Rex skeleton replica. Educational and hands-on.",
      condition: "mint" as const,
      attributes: { ageRating: "8+", manufacturer: "Dan&Darci", material: "plaster clay", category: "science STEM" } },

    // ── Notebooks ───────────────────────────────────────────────────
    { type: "notebook" as const, title: "Leuchtturm1917 A5 Dotted",
      description: "Classic A5 hardcover with 251 numbered dotted pages and two bookmarks.",
      condition: "mint" as const,
      attributes: { pages: 251, ruling: "dotted", brand: "Leuchtturm1917", size: "A5" } },

    { type: "notebook" as const, title: "Moleskine Classic Ruled Large",
      description: "The iconic black Moleskine hardcover with ruled pages and elastic closure.",
      condition: "mint" as const,
      attributes: { pages: 240, ruling: "ruled", brand: "Moleskine", size: "Large" } },

    { type: "notebook" as const, title: "Rhodia Webnotebook A5 Blank",
      description: "Premium blank notebook with ivory paper ideal for fountain pens.",
      condition: "near_mint" as const,
      attributes: { pages: 192, ruling: "blank", brand: "Rhodia", size: "A5" } },

    { type: "notebook" as const, title: "Hobonichi Techo A6 Daily Planner",
      description: "Japanese daily planner with tomoe river paper — one grid page per day.",
      condition: "mint" as const,
      attributes: { pages: 448, ruling: "grid planner", brand: "Hobonichi", size: "A6" } },

    { type: "notebook" as const, title: "Field Notes Original Kraft 3-pack",
      description: "Pocket-sized ruled memo books. The classic American work notebook.",
      condition: "mint" as const,
      attributes: { pages: 48, ruling: "ruled", brand: "Field Notes", size: "Pocket" } },
  ];

  console.log(`\nGenerating real semantic embeddings for ${seedItems.length} items using all-MiniLM-L6-v2…`);
  let i = 0;
  for (const item of seedItems) {
    i++;
    const text = [
      item.type, item.title, item.description,
      ...Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`),
    ].join(" | ");
    const embedding = await generateEmbedding(text);
    await db.insert(items).values({ ...item, embedding }).onConflictDoNothing();
    process.stdout.write(`\r  [${i}/${seedItems.length}] ${item.title.slice(0, 40).padEnd(40)}`);
  }

  console.log(`\n\n✓ Done! ${seedItems.length} items seeded with real embeddings.`);
  console.log("  Admin login: admin@vinylith.dev / admin1234");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
