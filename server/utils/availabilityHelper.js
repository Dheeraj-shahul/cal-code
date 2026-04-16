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
  
  // Collect all applicable availability windows for this date
  const windows = []
  const override = availability.overrides.find(o => o.date === dateStr)

  if (override) {
    // If override exists but has no start time, they marked it as "Unavailable (All day)"
    if (override.startTime && override.endTime) {
      windows.push({ start: override.startTime, end: override.endTime })
    }
  } else {
    // Use regular day slots mapping (collect all shifts for this day)
    const dayOfWeek = requestedDate.getDay() // 0=Sun...6=Sat
    const daySlots = availability.slots.filter(s => s.dayOfWeek === dayOfWeek)
    daySlots.forEach(ds => windows.push({ start: ds.startTime, end: ds.endTime }))
  }

  if (windows.length === 0) return []

  // Fetch existing (non-cancelled) bookings for the entire day to check for overlaps
  // We use the start of the day and end of the day in host timezone to bound the search
  const dayStartLocal = new Date(requestedDate)
  dayStartLocal.setHours(0, 0, 0, 0)
  const dayEndLocal = new Date(requestedDate)
  dayEndLocal.setHours(23, 59, 59, 999)

  const dayStartUTC = fromZonedTime(dayStartLocal, timezone)
  const dayEndUTC = fromZonedTime(dayEndLocal, timezone)

  const existingBookings = await prisma.booking.findMany({
    where: {
      eventType: { userId: eventType.userId },
      status: { not: 'CANCELLED' },
      startTime: { lt: dayEndUTC },
      endTime: { gt: dayStartUTC },
    },
  })

  const duration = eventType.durationMinutes
  const buffer = eventType.bufferMinutes || 0
  const step = duration + buffer
  const slots = []

  // Generate slots for each window
  for (const window of windows) {
    const [startH, startM] = window.start.split(':').map(Number)
    const [endH, endM] = window.end.split(':').map(Number)

    const windowStartLocal = new Date(requestedDate)
    windowStartLocal.setHours(startH, startM, 0, 0)
    const windowEndLocal = new Date(requestedDate)
    windowEndLocal.setHours(endH, endM, 0, 0)

    const windowStartUTC = fromZonedTime(windowStartLocal, timezone)
    const windowEndUTC = fromZonedTime(windowEndLocal, timezone)

    let cursor = new Date(windowStartUTC)
    while (true) {
      const slotEnd = addMinutes(cursor, duration)
      if (slotEnd > windowEndUTC) break

      // Check for overlap with existing bookings
      const hasOverlap = existingBookings.some(b => cursor < b.endTime && slotEnd > b.startTime)
      const isFuture = cursor > new Date()

      if (!hasOverlap && isFuture) {
        slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() })
      }

      cursor = addMinutes(cursor, step)
    }
  }

  return slots;
}

module.exports = { getAvailableSlots };
