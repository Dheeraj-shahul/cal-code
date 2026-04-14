const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: 'admin@calclone.com' },
    update: {},
    create: {
      name: 'Alex Johnson',
      email: 'admin@calclone.com',
      timezone: 'Asia/Kolkata',
    },
  });

  console.log(`✅ User: ${user.name} (id=${user.id})`);

  // Create event types
  const eventTypes = await Promise.all([
    prisma.eventType.upsert({
      where: { slug: '15min-meeting' },
      update: {},
      create: {
        userId: user.id,
        title: '15 Minute Meeting',
        description: 'A quick sync call to discuss brief topics.',
        durationMinutes: 15,
        slug: '15min-meeting',
        bufferMinutes: 5,
      },
    }),
    prisma.eventType.upsert({
      where: { slug: '30min-call' },
      update: {},
      create: {
        userId: user.id,
        title: '30 Minute Call',
        description: 'A collaborative discussion or intro call.',
        durationMinutes: 30,
        slug: '30min-call',
        bufferMinutes: 10,
      },
    }),
    prisma.eventType.upsert({
      where: { slug: '1hr-consultation' },
      update: {},
      create: {
        userId: user.id,
        title: '1 Hour Consultation',
        description: 'In-depth consultation session.',
        durationMinutes: 60,
        slug: '1hr-consultation',
        bufferMinutes: 15,
      },
    }),
  ]);

  console.log(`✅ Event types: ${eventTypes.map((e) => e.title).join(', ')}`);

  // Create availability (Mon-Fri, 9AM-5PM IST)
  const existingAvailability = await prisma.availability.findUnique({ where: { userId: user.id } });
  if (!existingAvailability) {
    await prisma.availability.create({
      data: {
        userId: user.id,
        timezone: 'Asia/Kolkata',
        slots: {
          create: [1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
          })),
        },
      },
    });
    console.log('✅ Availability: Mon-Fri 9AM-5PM IST');
  }

  // Create sample bookings (use future dates relative to now)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(11, 0, 0, 0);

  await prisma.booking.createMany({
    data: [
      {
        eventTypeId: eventTypes[0].id,
        bookerName: 'Priya Sharma',
        bookerEmail: 'priya@example.com',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 15 * 60 * 1000),
        status: 'UPCOMING',
      },
      {
        eventTypeId: eventTypes[1].id,
        bookerName: 'Rahul Verma',
        bookerEmail: 'rahul@example.com',
        startTime: dayAfter,
        endTime: new Date(dayAfter.getTime() + 30 * 60 * 1000),
        status: 'UPCOMING',
      },
      {
        eventTypeId: eventTypes[2].id,
        bookerName: 'Sara Ahmed',
        bookerEmail: 'sara@example.com',
        startTime: yesterday,
        endTime: new Date(yesterday.getTime() + 60 * 60 * 1000),
        status: 'PAST',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Sample bookings created');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
