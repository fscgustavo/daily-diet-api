import { z } from 'zod'

export const mealParamsSchema = z.object({ id: z.string().uuid() })

export const mealBodySchema = z.object({
  title: z.string(),
  description: z.string(),
  diet: z.coerce.boolean(),
})
