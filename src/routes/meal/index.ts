import { FastifyInstance } from 'fastify'
import { knex } from '../../database'
import { randomUUID } from 'node:crypto'
import { mealBodySchema, mealParamsSchema } from '../../schemas'
import { checkRequestIds } from '../../middlewares/check-request-ids'

export async function mealRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { sessionId } = request.cookies

    const meals = await knex('meals').where('session_id', sessionId).select('*')

    return { meals }
  })

  app.post('/', async (request, reply) => {
    const body = mealBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      ...body,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })

  app.get('/:id', { preHandler: checkRequestIds }, async (request) => {
    const { id } = mealParamsSchema.parse(request.params)

    const { sessionId } = request.cookies

    const meal = await knex('meals')
      .where({ id, session_id: sessionId })
      .first()

    return { meal }
  })

  app.put('/:id', { preHandler: checkRequestIds }, async (request, reply) => {
    const idParamResult = mealParamsSchema.safeParse(request.params)
    const bodyResult = mealBodySchema.safeParse(request.body)

    if (!bodyResult.success || !idParamResult.success) {
      return reply.status(400).send()
    }

    await knex('meals')
      .update(bodyResult.data)
      .where({ id: idParamResult.data.id })

    return reply.status(204).send()
  })

  app.delete(
    '/:id',
    { preHandler: checkRequestIds },
    async (request, reply) => {
      const { id } = mealParamsSchema.parse(request.params)

      await knex('meals').delete().where({ id })

      return reply.status(204).send()
    },
  )

  app.get('/summary', async (request) => {
    const { sessionId } = request.cookies

    const result = await knex.raw(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN diet = true THEN 1 ELSE 0 END) AS diet,
      SUM(CASE WHEN diet = false THEN 1 ELSE 0 END) AS nonDiet
    FROM meals WHERE session_id='${sessionId}';
    `)

    return { summary: result[0] }
  })
}
