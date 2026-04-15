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
    include: {
      user: {
        include: {
          availabilities: {
            where: { isDefault: true },
            include: { slots: true, overrides: true }
          }
        }
      }
    },
  });

  if (!eventType) throw new Error('Event type not found');

  const availability = eventType.user.availabilities[0];
  if (!availability) return [];

  const timezone = availability.timezone || 'Asia/Kolkata';

  // Parse the requested date in the host timezone
  const requestedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
  
  // Check for override on this specific date
  const override = availability.overrides.find(o => o.date === dateStr);
  let startH, startM, endH, endM;

  if (override) {
    // If override exists but has no start time, they marked it as "Unavailable (All day)"
    if (!override.startTime || !override.endTime) return [];
    [startH, startM] = override.startTime.split(':').map(Number);
    [endH, endM] = override.endTime.split(':').map(Number);
  } else {
    // Use regular day slots mapping
    const dayOfWeek = requestedDate.getDay(); // 0=Sun...6=Sat
    const daySlot = availability.slots.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySlot) return [];
    [startH, startM] = daySlot.startTime.split(':').map(Number);
    [endH, endM] = daySlot.endTime.split(':').map(Number);
  }

  // Build all possible time slots on this day
  const duration = eventType.durationMinutes;
  const buffer = eventType.bufferMinutes || 0;
  const step = duration + buffer;

  // Build window start/end in host timezone
  const windowStartLocal = new Date(requestedDate);
  windowStartLocal.setHours(startH, startM, 0, 0);
  const windowEndLocal = new Date(requestedDate);
  windowEndLocal.setHours(endH, endM, 0, 0);

  // Convert to UTC for DB comparison
  const windowStartUTC = fromZonedTime(windowStartLocal, timezone);
  const windowEndUTC = fromZonedTime(windowEndLocal, timezone);

  // Fetch existing (non-cancelled) bookings that overlap this window for ALL event types under this user
  const existingBookings = await prisma.booking.findMany({
    where: {
      eventType: {
        userId: eventType.userId
      },
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

    const isFuture = cursor > new Date();

    if (!hasOverlap && isFuture) {
      slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
    }

    cursor = addMinutes(cursor, step);
  }

  return slots;
}

module.exports = { getAvailableSlots };
