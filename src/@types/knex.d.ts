// eslint-disable-next-line
import {Knex} from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      session_id: string
      title: string
      description: string
      created_at: string
      diet: boolean
    }
  }
}
