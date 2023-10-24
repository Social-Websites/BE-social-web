const Users = require("../models/user");


class UsersController {
  async getUser(req, res, next) {
    const userID = req.user._id;
    await Users.find({_id: userID})
      .then((users) => {
        res.json(users);
      })
      .catch(next);
  }
}

module.exports = new UsersController();