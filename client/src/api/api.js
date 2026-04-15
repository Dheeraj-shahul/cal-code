import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// ── Event Types ──────────────────────────────────────────────
export const getEventTypes = () => api.get('/event-types')
export const getEventTypeBySlug = (slug) => api.get(`/event-types/slug/${slug}`)
export const createEventType = (data) => api.post('/event-types', data)
export const updateEventType = (id, data) => api.put(`/event-types/${id}`, data)
export const deleteEventType = (id) => api.delete(`/event-types/${id}`)

// ── Availability ─────────────────────────────────────────────
export const getAvailability = () => api.get('/availability')
export const createAvailability = (data) => api.post('/availability', data)
export const updateAvailability = (id, data) => api.put(`/availability/${id}`, data)
export const deleteAvailability = (id) => api.delete(`/availability/${id}`)

// ── Bookings ─────────────────────────────────────────────────
export const getAvailableSlots = (eventTypeId, date) =>
  api.get('/bookings/available-slots', { params: { eventTypeId, date } })
export const createBooking = (data) => api.post('/bookings', data)
export const getBookings = (status) =>
  api.get('/bookings', { params: status ? { status } : {} })
export const getBookingById = (id) => api.get(`/bookings/${id}`)
export const cancelBooking = (id) => api.delete(`/bookings/${id}`)

export default api
