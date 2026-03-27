import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { id: "demo-user-1" },
    update: {},
    create: {
      id: "demo-user-1",
      displayName: "Demo Traveler",
    },
  });

  console.log(`✅ Created user: ${user.displayName}`);

  // Create published trips
  const trip1 = await prisma.trip.upsert({
    where: { id: "trip-1" },
    update: {},
    create: {
      id: "trip-1",
      authorId: user.id,
      title: "京都の秋：紅葉巡りの旅",
      summary: "古都京都の紅葉を巡る3日間の旅。清水寺、金閣寺、嵐山を訪れました。",
      city: "京都",
      country: "日本",
      status: "PUBLISHED",
      publishedAt: new Date("2024-11-15"),
    },
  });

  const trip2 = await prisma.trip.upsert({
    where: { id: "trip-2" },
    update: {},
    create: {
      id: "trip-2",
      authorId: user.id,
      title: "バリ島リゾート満喫",
      summary: "ビーチとウブドの自然を楽しむリラックスした5日間。",
      city: "バリ",
      country: "インドネシア",
      status: "PUBLISHED",
      publishedAt: new Date("2024-10-20"),
    },
  });

  // Create a draft trip
  const trip3 = await prisma.trip.upsert({
    where: { id: "trip-3" },
    update: {},
    create: {
      id: "trip-3",
      authorId: user.id,
      title: "パリ街歩き（作成中）",
      summary: null,
      city: "パリ",
      country: "フランス",
      status: "DRAFT",
    },
  });

  console.log(`✅ Created trips: ${trip1.title}, ${trip2.title}, ${trip3.title}`);

  // Add spots to trip1
  const kyotoSpots = [
    {
      id: "spot-1",
      tripId: trip1.id,
      name: "清水寺",
      lat: 34.9949,
      lng: 135.785,
      address: "京都府京都市東山区清水1-294",
      notes: "紅葉が見事でした。音羽の滝で水を飲んで、本堂からの眺めは最高！",
    },
    {
      id: "spot-2",
      tripId: trip1.id,
      name: "金閣寺",
      lat: 35.0394,
      lng: 135.7292,
      address: "京都府京都市北区金閣寺町1",
      notes: "黄金に輝く寺院と紅葉のコントラストが美しい。",
    },
    {
      id: "spot-3",
      tripId: trip1.id,
      name: "嵐山",
      lat: 35.0094,
      lng: 135.6686,
      address: "京都府京都市右京区嵐山",
      notes: "竹林の小径を散策。渡月橋からの景色が素晴らしかった。",
    },
  ];

  for (const spotData of kyotoSpots) {
    await prisma.spot.upsert({
      where: { id: spotData.id },
      update: {},
      create: spotData,
    });
  }

  // Add spots to trip2
  const baliSpots = [
    {
      id: "spot-4",
      tripId: trip2.id,
      name: "スミニャックビーチ",
      lat: -8.6918,
      lng: 115.1672,
      address: "Seminyak Beach, Bali, Indonesia",
      notes: "サンセットが美しいビーチ。ビーチクラブで過ごす時間は最高でした。",
    },
    {
      id: "spot-5",
      tripId: trip2.id,
      name: "テガララン棚田",
      lat: -8.4347,
      lng: 115.2810,
      address: "Tegallalang, Gianyar, Bali, Indonesia",
      notes: "圧巻の棚田風景。カフェでバリコーヒーを飲みながらゆっくり。",
    },
    {
      id: "spot-6",
      tripId: trip2.id,
      name: "ウルワツ寺院",
      lat: -8.8290,
      lng: 115.0859,
      address: "Uluwatu Temple, Bali, Indonesia",
      notes: "断崖絶壁に立つ寺院。夕方のケチャックダンスは見応えがありました。",
    },
  ];

  for (const spotData of baliSpots) {
    await prisma.spot.upsert({
      where: { id: spotData.id },
      update: {},
      create: spotData,
    });
  }

  // Add spot to draft trip
  await prisma.spot.upsert({
    where: { id: "spot-7" },
    update: {},
    create: {
      id: "spot-7",
      tripId: trip3.id,
      name: "エッフェル塔",
      lat: 48.8584,
      lng: 2.2945,
      address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
      notes: "パリのシンボル！夜のライトアップが素晴らしかった。",
    },
  });

  console.log("✅ Created spots");

  // Add some likes and saves
  await prisma.like.upsert({
    where: {
      userId_tripId: {
        userId: user.id,
        tripId: trip1.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      tripId: trip1.id,
    },
  });

  await prisma.save.upsert({
    where: {
      userId_tripId: {
        userId: user.id,
        tripId: trip2.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      tripId: trip2.id,
    },
  });

  console.log("✅ Created likes and saves");

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
