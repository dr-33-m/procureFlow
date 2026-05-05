import { createServerFn } from '@tanstack/react-start'
import { db, stations } from '@/db'
import { eq, and } from 'drizzle-orm'

export const getStations = createServerFn({ method: 'GET' }).handler(async () => {
  const hotelId = process.env.MOCK_HOTEL_ID!
  return db
    .select()
    .from(stations)
    .where(eq(stations.hotelId, hotelId))
    .orderBy(stations.name)
})

export const createStation = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const [station] = await db
      .insert(stations)
      .values({ hotelId, name: data.name.trim() })
      .returning()
    return station
  })

export const deleteStation = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    await db
      .delete(stations)
      .where(and(eq(stations.id, id), eq(stations.hotelId, hotelId)))
    return { success: true }
  })
