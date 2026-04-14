const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/availability - get availability for default user
router.get('/', async (req, res, next) => {
  try {
    let availability = await prisma.availability.findUnique({
      where: { userId: 1 },
      include: { slots: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!availability) {
      // Auto-create default Mon-Fri 9-5 if not set
      availability = await prisma.availability.create({
        data: {
          userId: 1,
          timezone: 'Asia/Kolkata',
          slots: {
            create: [1, 2, 3, 4, 5].map((day) => ({
              dayOfWeek: day,
              startTime: '09:00',
              endTime: '17:00',
            })),
          },
        },
        include: { slots: { orderBy: { dayOfWeek: 'asc' } } },
      });
    }
    res.json(availability);
  } catch (err) {
    next(err);
  }
});

// PUT /api/availability - update availability (full replace of slots)
router.put('/', async (req, res, next) => {
  try {
    const { timezone, slots } = req.body;
    // slots: [{ dayOfWeek, startTime, endTime }]

    let availability = await prisma.availability.findUnique({ where: { userId: 1 } });

    if (!availability) {
      availability = await prisma.availability.create({
        data: { userId: 1, timezone: timezone || 'Asia/Kolkata' },
      });
    }

    // Replace all slots
    await prisma.availabilitySlot.deleteMany({ where: { availabilityId: availability.id } });

    const updated = await prisma.availability.update({
      where: { userId: 1 },
      data: {
        timezone: timezone || availability.timezone,
        slots: {
          create: (slots || []).map((s) => ({
            dayOfWeek: parseInt(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      },
      include: { slots: { orderBy: { dayOfWeek: 'asc' } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
