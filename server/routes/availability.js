const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/availability - array of all schedules for user
router.get('/', async (req, res, next) => {
  try {
    const availabilities = await prisma.availability.findMany({
      where: { userId: 1 },
      include: { slots: { orderBy: { dayOfWeek: 'asc' } }, overrides: true },
      orderBy: { id: 'asc' }
    });

    if (availabilities.length === 0) {
      // Create initial schedule if none exists
      const newAvail = await prisma.availability.create({
        data: {
          userId: 1,
          name: 'Working hours',
          isDefault: true,
          timezone: 'Asia/Kolkata',
          slots: {
            create: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }))
          }
        },
        include: { slots: true, overrides: true }
      });
      return res.json([newAvail]);
    }

    res.json(availabilities);
  } catch (err) {
    next(err);
  }
});

// POST /api/availability - clone a schedule
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    // Find the default schedule to copy slots from
    let sourceAvail = await prisma.availability.findFirst({ where: { userId: 1, isDefault: true }, include: { slots: true } });
    if (!sourceAvail) {
      sourceAvail = await prisma.availability.findFirst({ where: { userId: 1 }, include: { slots: true } });
    }

    const newAvail = await prisma.availability.create({
      data: {
        userId: 1,
        name: name || 'New Schedule',
        timezone: sourceAvail?.timezone || 'Asia/Kolkata',
        isDefault: false,
        slots: {
          create: (sourceAvail?.slots || []).map(s => ({
            dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime
          }))
        }
      },
      include: { slots: true, overrides: true }
    });
    res.json(newAvail);
  } catch (err) { next(err); }
});

// PUT /api/availability/:id - update specific schedule and sync slots/overrides
router.put('/:id', async (req, res, next) => {
  try {
    const { name, isDefault, timezone, slots, overrides } = req.body;
    const availId = parseInt(req.params.id);

    // If setting as default, unset others
    if (isDefault) {
      await prisma.availability.updateMany({
        where: { userId: 1 },
        data: { isDefault: false }
      });
    }

    // Sync slots
    if (slots) {
      await prisma.availabilitySlot.deleteMany({ where: { availabilityId: availId } });
      await prisma.availabilitySlot.createMany({
        data: slots.map(s => ({ availabilityId: availId, dayOfWeek: parseInt(s.dayOfWeek), startTime: s.startTime, endTime: s.endTime }))
      });
    }

    // Sync overrides
    if (overrides) {
      await prisma.availabilityOverride.deleteMany({ where: { availabilityId: availId } });
      await prisma.availabilityOverride.createMany({
        data: overrides.map(o => ({ availabilityId: availId, date: o.date, startTime: o.startTime || null, endTime: o.endTime || null }))
      });
    }

    const updated = await prisma.availability.update({
      where: { id: availId },
      data: {
        name: name !== undefined ? name : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
        timezone: timezone !== undefined ? timezone : undefined,
      },
      include: { slots: { orderBy: { dayOfWeek: 'asc' } }, overrides: true }
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/availability/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const availId = parseInt(req.params.id);
    await prisma.availability.delete({ where: { id: availId } });
    
    // Automatically make another one default if we deleted the default one
    const remaining = await prisma.availability.findFirst({ where: { userId: 1 } });
    if (remaining) {
      const activeDefault = await prisma.availability.findFirst({ where: { userId: 1, isDefault: true } });
      if (!activeDefault) {
        await prisma.availability.update({ where: { id: remaining.id }, data: { isDefault: true } });
      }
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
