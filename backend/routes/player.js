const express = require('express');
const knex = require('../db/knex');
const { COACH, JOURNALIST, DEVELOPER, PLAYER } = require('../constants/roles');

const router = express.Router();

/**
 * @openapi
 * /player:
 *   get:
 *     summary: List players (non-Player roles only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of players for selection lists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:            { type: integer, example: 3 }
 *                   preferredName: { type: string, nullable: true, example: "P1" }
 *                   jerseyName:    { type: string, nullable: true, example: "P.ONE" }
 *       403: { description: Access denied (Players cannot list all players) }
 *       401: { description: Unauthorized }
 */
// list players (non-Players only)
router.get('/', async (req, res) => {
  if (req.user.role === PLAYER) return res.status(403).json({ message: 'Access denied' });
  const rows = await knex('Players').select('id','preferredName','jerseyName');
  res.json(rows);
});

/**
 * @openapi
 * /player/me:
 *   get:
 *     summary: Get own player profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Player profile + visibilities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: integer }
 *                 fullName: { type: string, nullable: true }
 *                 preferredName: { type: string, nullable: true }
 *                 jerseyName: { type: string, nullable: true }
 *                 dob: { type: string, nullable: true }
 *                 position: { type: string, nullable: true }
 *                 visibilities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field: { type: string }
 *                       visibleTo: { type: string }
 *       401: { description: Unauthorized }
 */
// my profile
router.get('/me', async (req, res) => {
  const p = await knex('Players').where({ userId: req.user.id }).first();
  if (!p) return res.status(404).json({ message: 'Player not found' });
  const vis = await knex('PlayerFieldVisibility').where({ playerId: p.id }).select('field','visibleTo');
  res.json({ ...p, visibilities: vis });
});

/**
 * @openapi
 * /player/me:
 *   put:
 *     summary: Update own player profile and field visibility
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:      { type: string, nullable: true }
 *               preferredName: { type: string, nullable: true }
 *               jerseyName:    { type: string, nullable: true }
 *               dob:           { type: string, nullable: true, example: "2000-01-02" }
 *               position:      { type: string, nullable: true, example: "Forward" }
 *               visibility:
 *                 type: object
 *                 additionalProperties:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [Coach, Journalist, Developer]
 *                 example:
 *                   preferredName: ["Coach","Journalist","Developer"]
 *                   jerseyName: ["Coach","Developer"]
 *     responses:
 *       200:
 *         description: Update succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Profile and visibility updated successfully }
 *       401: { description: Unauthorized }
 *       404: { description: Player not found }
 *       500: { description: Update failed }
 */
// update my profile + visibility
router.put('/me', async (req, res) => {
  const p = await knex('Players').where({ userId: req.user.id }).first('id');
  if (!p) return res.status(404).json({ message: 'Player not found' });

  await knex('Players').where({ userId: req.user.id }).update({
    fullName: req.body.fullName,
    preferredName: req.body.preferredName,
    jerseyName: req.body.jerseyName,
    dob: req.body.dob,
    position: req.body.position
  });

  await knex('PlayerFieldVisibility').where({ playerId: p.id }).del();
  const visibility = req.body.visibility || {};
  const payload = [];
  for (const field in visibility) (visibility[field] || []).forEach(v => payload.push({ playerId: p.id, field, visibleTo: v }));
  if (payload.length) await knex('PlayerFieldVisibility').insert(payload);

  res.json({ message: 'Profile and visibility updated successfully' });
});

/**
 * @openapi
 * /player/{id}:
 *   get:
 *     summary: Get a player's fields filtered by your role (or by context query)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Player ID
 *       - in: query
 *         name: context
 *         required: false
 *         schema:
 *           type: string
 *           enum: [club, media, fantasy]
 *         description: Overrides token role mapping → club=Coach, media=Journalist, fantasy=Developer
 *     responses:
 *       200:
 *         description: Object with only the allowed fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *             examples:
 *               coachView:
 *                 value: { preferredName: "P1", jerseyName: "P.ONE", position: "Forward" }
 *       401: { description: Unauthorized }
 *       404: { description: Player not found }
 */
// get player by role visibility
router.get('/:id', async (req, res) => {
  const playerId = req.params.id;
  const roleFromToken = req.user.role;
  const userId = req.user.id;

  const map = { club: COACH, media: JOURNALIST, fantasy: DEVELOPER };
  const role = map[req.query.context] || roleFromToken;

  const player = await knex('Players').where({ id: playerId }).first();
  if (!player) return res.status(404).json({ message: 'Player not found' });

  if (roleFromToken === PLAYER && player.userId === userId) return res.json(player);

  const allowedFields = await knex('PlayerFieldVisibility')
    .where({ playerId })
    .andWhere({ visibleTo: role })
    .pluck('field');

  const result = {};
  allowedFields.forEach(f => { result[f] = player[f]; });
  res.json(result);
});

module.exports = router;
