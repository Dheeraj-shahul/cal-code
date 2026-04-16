const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { getAvailableSlots } = require('../utils/availabilityHelper');
const prisma = new PrismaClient();

// GET /api/bookings/available-slots?eventTypeId=1&date=2026-04-15
router.get('/available-slots', async (req, res, next) => {
  try {
    const { eventTypeId, date } = req.query;
    if (!eventTypeId || !date) {
      return res.status(400).json({ error: 'eventTypeId and date are required' });
    }
    const slots = await getAvailableSlots(eventTypeId, date);
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings - list bookings (optional ?status=UPCOMING|CANCELLED)
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const now = new Date();

    // Auto-update past bookings
    await prisma.booking.updateMany({
      where: { startTime: { lt: now }, status: 'UPCOMING' },
      data: { status: 'PAST' },
    });

    const where = { eventType: { userId: 1 } };
    if (status === 'UPCOMING') where.status = 'UPCOMING';
    else if (status === 'PAST') where.status = 'PAST';
    else if (status === 'CANCELLED') where.status = 'CANCELLED';

    const bookings = await prisma.booking.findMany({
      where,
      include: { eventType: { select: { title: true, slug: true, durationMinutes: true } } },
      orderBy: { startTime: 'asc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { eventType: { select: { id: true, title: true, slug: true, durationMinutes: true } } },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings - create a booking
router.post('/', async (req, res, next) => {
  try {
    const { eventTypeId, bookerName, bookerEmail, startTime } = req.body;
    if (!eventTypeId || !bookerName || !bookerEmail || !startTime) {
      return res.status(400).json({ error: 'eventTypeId, bookerName, bookerEmail, startTime are required' });
    }

    const eventType = await prisma.eventType.findUnique({ where: { id: parseInt(eventTypeId) } });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + eventType.durationMinutes * 60 * 1000);

    // Double-booking check
    const conflict = await prisma.booking.findFirst({
      where: {
        eventTypeId: parseInt(eventTypeId),
        status: { not: 'CANCELLED' },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      return res.status(409).json({ error: 'This time slot is already booked. Please pick another.' });
    }

    const booking = await prisma.booking.create({
      data: {
        eventTypeId: parseInt(eventTypeId),
        bookerName,
        bookerEmail,
        startTime: start,
        endTime: end,
        status: 'UPCOMING',
      },
      include: { eventType: { select: { title: true, slug: true, durationMinutes: true } } },
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookings/:id - cancel a booking
router.delete('/:id', async (req, res, next) => {
  try {
    const { cancellationReason } = req.body || {};
    const booking = await prisma.booking.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || null,
      },
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/reschedule - reschedule an existing booking
router.put('/:id/reschedule', async (req, res, next) => {
  try {
    const { startTime } = req.body;
    if (!startTime) return res.status(400).json({ error: 'startTime is required for rescheduling' });

    const bookingId = parseInt(req.params.id);
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { eventType: true }
    });

    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + existing.eventType.durationMinutes * 60 * 1000);

    // Double-booking check excluding this exact booking
    const conflict = await prisma.booking.findFirst({
      where: {
        eventTypeId: existing.eventTypeId,
        status: { not: 'CANCELLED' },
        id: { not: bookingId }, // Exclude self
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      return res.status(409).json({ error: 'This time slot is already booked. Please pick another.' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: start,
        endTime: end,
        isRescheduled: true
      },
      include: { eventType: { select: { title: true, slug: true, durationMinutes: true } } },
    });

    res.json(updated);
  } catch(err) {
    next(err);
  }
});

module.exports = router;
