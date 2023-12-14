import request from 'supertest'
import { execSync } from 'node:child_process'
import { app } from '../../app'
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest'

describe('Meal Routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('pnpm knex migrate:rollback --all')
    execSync('pnpm knex migrate:latest')
  })

  const fakeMeal = {
    title: 'Croissant',
    description: 'A chicken croissant',
    diet: 0,
  }

  it('shoud be able to list all meals', async () => {
    const registerMealsResponse = await request(app.server)
      .post('/meals')
      .send(fakeMeal)
      .expect(201)

    await request(app.server).post('/meals').send({
      name: 'Hamburger',
      description: 'Consumed by other person. Should not be listed',
      diet: false,
    })

    const cookies = registerMealsResponse.get('Set-Cookie')

    const listMeal = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(listMeal.body.meals).toEqual([expect.objectContaining(fakeMeal)])
  })

  it('shoud be able to get a specific meal', async () => {
    const registerMealsResponse = await request(app.server)
      .post('/meals')
      .send(fakeMeal)

    const cookies = registerMealsResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({
        name: 'Hamburger',
        description: 'Will not be returned',
        diet: false,
      })
      .set('Cookie', cookies)

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMealsResponse.body.meals[0].id

    const getMealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getMealResponse.body.meal).toEqual(expect.objectContaining(fakeMeal))
  })

  it('shoud be able to update a meal', async () => {
    const registerMealsResponse = await request(app.server)
      .post('/meals')
      .send(fakeMeal)

    const cookies = registerMealsResponse.get('Set-Cookie')

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = listMealsResponse.body.meals[0].id

    await request(app.server)
      .put(`/meals/${mealId}`)
      .send({ ...fakeMeal, description: 'A chocolate croissant' })
      .set('Cookie', cookies)
      .expect(204)

    const getUpdatedMeal = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)

    expect(getUpdatedMeal.body.meal).toEqual(
      expect.objectContaining({
        ...fakeMeal,
        description: 'A chocolate croissant',
      }),
    )
  })

  it('shoud be able to delete a meal', async () => {
    const registerMealsResponse = await request(app.server)
      .post('/meals')
      .send(fakeMeal)

    const cookies = registerMealsResponse.get('Set-Cookie')

    const responseWithMeal = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = responseWithMeal.body.meals[0].id

    await request(app.server)
      .delete(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(204)

    const responseWithoutMeal = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    expect(responseWithoutMeal.body.meals).toEqual([])
  })

  it('should return unauthorized if the meal is from another user', async () => {
    await request(app.server).post('/meals').send(fakeMeal)

    const registerMealResponse = await request(app.server)
      .post('/meals')
      .send(fakeMeal)

    const cookies = registerMealResponse.get('Set-Cookie')

    const responseWithMeal = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)

    const mealId = responseWithMeal.body.meals[0].id

    const specificMealPath = `/meals/${mealId}`

    await request(app.server).put(specificMealPath).expect(401)
    await request(app.server).delete(specificMealPath).expect(401)
    await request(app.server).get(specificMealPath).expect(401)
  })

  it('should be able to get the summary', async () => {
    const registerMealsResponse = await request(app.server)
      .post('/meals')
      .send(fakeMeal)

    const cookies = registerMealsResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .send({ ...fakeMeal, diet: true })
      .set('Cookie', cookies)

    await request(app.server)
      .post('/meals')
      .send({ ...fakeMeal, diet: true })
      .set('Cookie', cookies)

    const summaryResponse = await request(app.server)
      .get('/meals/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(summaryResponse.body.summary).toEqual(
      expect.objectContaining({ total: 3, nonDiet: 1, diet: 2 }),
    )
  })
})
