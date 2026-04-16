const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/event-types - list all event types for the default user (id=1)
router.get('/', async (req, res, next) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: 1 },
      orderBy: { createdAt: 'desc' },
    });
    res.json(eventTypes);
  } catch (err) {
    next(err);
  }
});

// GET /api/event-types/slug/:slug - public lookup by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const eventType = await prisma.eventType.findUnique({
      where: { slug: req.params.slug },
      include: { user: { select: { name: true, timezone: true } } },
    });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });
    res.json(eventType);
  } catch (err) {
    next(err);
  }
});

// GET /api/event-types/:id
router.get('/:id', async (req, res, next) => {
  try {
    const eventType = await prisma.eventType.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });
    res.json(eventType);
  } catch (err) {
    next(err);
  }
});

// POST /api/event-types - create
router.post('/', async (req, res, next) => {
  try {
    const { title, description, durationMinutes, slug, bufferMinutes } = req.body;
    if (!title || !durationMinutes || !slug) {
      return res.status(400).json({ error: 'title, durationMinutes, slug are required' });
    }
    const eventType = await prisma.eventType.create({
      data: {
        userId: 1,
        title,
        description: description || '',
        durationMinutes: parseInt(durationMinutes),
        slug,
        bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : 0,
      },
    });
    res.status(201).json(eventType);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already in use. Choose a different URL slug.' });
    }
    next(err);
  }
});

// PUT /api/event-types/:id - update
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, durationMinutes, slug, bufferMinutes, isHidden } = req.body;
    const eventType = await prisma.eventType.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(durationMinutes && { durationMinutes: parseInt(durationMinutes) }),
        ...(slug && { slug }),
        ...(bufferMinutes !== undefined && { bufferMinutes: parseInt(bufferMinutes) }),
        ...(isHidden !== undefined && { isHidden }),
      },
    });
    res.json(eventType);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already in use.' });
    }
    next(err);
  }
});

// DELETE /api/event-types/:id - delete
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.eventType.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Event type deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
