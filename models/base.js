const { Model } = require('objection');
const knex = require('../db/knex');

Model.knex(knex);

class Base extends Model {
  $beforeInsert() {
    this.created_at = new Date();
  }

  $beforeUpdate() {
    this.updated_at = new Date();
  }
}

module.exports = Base;
