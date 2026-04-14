const { PrismaClient } = require('@prisma/client');
const { addMinutes, format, parse, isBefore, isEqual } = require('date-fns');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');

const prisma = new PrismaClient();

/**
 * Generate available time slots for a given date and eventType.
 * Returns array of { start, end } UTC ISO strings.
 */
async function getAvailableSlots(eventTypeId, dateStr) {
  // dateStr = "YYYY-MM-DD"
  const eventType = await prisma.eventType.findUnique({
    where: { id: parseInt(eventTypeId) },
    include: { user: { include: { availability: { include: { slots: true } } } } },
  });

  if (!eventType) throw new Error('Event type not found');

  const availability = eventType.user.availability;
  if (!availability) return [];

  const timezone = availability.timezone || 'Asia/Kolkata';

  // Parse the requested date in the host timezone
  const requestedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
  const dayOfWeek = requestedDate.getDay(); // 0=Sun...6=Sat

  const daySlot = availability.slots.find((s) => s.dayOfWeek === dayOfWeek);
  if (!daySlot) return [];

  // Build all possible time slots on this day
  const duration = eventType.durationMinutes;
  const buffer = eventType.bufferMinutes || 0;
  const step = duration + buffer;

  const [startH, startM] = daySlot.startTime.split(':').map(Number);
  const [endH, endM] = daySlot.endTime.split(':').map(Number);

  // Build window start/end in host timezone
  const windowStartLocal = new Date(requestedDate);
  windowStartLocal.setHours(startH, startM, 0, 0);
  const windowEndLocal = new Date(requestedDate);
  windowEndLocal.setHours(endH, endM, 0, 0);

  // Convert to UTC for DB comparison
  const windowStartUTC = fromZonedTime(windowStartLocal, timezone);
  const windowEndUTC = fromZonedTime(windowEndLocal, timezone);

  // Fetch existing (non-cancelled) bookings that overlap this window
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: parseInt(eventTypeId),
      status: { not: 'CANCELLED' },
      startTime: { lt: windowEndUTC },
      endTime: { gt: windowStartUTC },
    },
  });

  // Generate slots
  const slots = [];
  let cursor = new Date(windowStartUTC);

  while (true) {
    const slotEnd = addMinutes(cursor, duration);
    if (slotEnd > windowEndUTC) break;

    // Check for overlap with existing bookings
    const hasOverlap = existingBookings.some(
      (b) => cursor < b.endTime && slotEnd > b.startTime
    );

    if (!hasOverlap) {
      slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
    }

    cursor = addMinutes(cursor, step);
  }

  return slots;
}

module.exports = { getAvailableSlots };
