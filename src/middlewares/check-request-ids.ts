import { FastifyReply, FastifyRequest } from 'fastify'
import { knex } from '../database'
import { mealParamsSchema } from '../schemas'

export async function checkRequestIds(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { sessionId } = request.cookies
  const idParamsResult = mealParamsSchema.safeParse(request.params)

  if (!sessionId) {
    return reply.status(401).send({ error: 'Unauthorized.' })
  }

  if (idParamsResult.success) {
    const result = await knex('meals').select().where({
      id: idParamsResult.data.id,
      session_id: sessionId,
    })

    if (!result.length) {
      return reply.status(401).send({ error: 'Unauthorized.' })
    }
  }
}
