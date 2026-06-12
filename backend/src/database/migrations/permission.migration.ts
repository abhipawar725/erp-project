// import { Sequelize } from "sequelize";

// await queryInterface.createTable('employee_permissions', {
//   id: {
//     type: Sequelize.INTEGER.UNSIGNED,
//     autoIncrement: true,
//     primaryKey: true,
//   },

//   company_id: {
//     type: Sequelize.INTEGER.UNSIGNED,
//     allowNull: false,
//   },

//   employee_id: {
//     type: Sequelize.INTEGER.UNSIGNED,
//     allowNull: false,
//   },

//   permission_id: {
//     type: Sequelize.INTEGER.UNSIGNED,
//     allowNull: false,
//   },

//   type: {
//     type: Sequelize.ENUM('grant', 'revoke'),
//     allowNull: false,
//   },

//   created_by: {
//     type: Sequelize.INTEGER.UNSIGNED,
//     allowNull: true,
//   },

//   createdAt: {
//     type: Sequelize.DATE,
//     allowNull: false,
//   },

//   updatedAt: {
//     type: Sequelize.DATE,
//     allowNull: false,
//   },
// });

// await queryInterface.addIndex(
//   'employee_permissions',
//   ['employee_id', 'permission_id'],
//   {
//     unique: true,
//   }
// );