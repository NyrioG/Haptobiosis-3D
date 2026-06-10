// Machine à états : pilote les phases de l'expérience.
// idle    -> écran de veille, caméra qui dérive doucement
// awake   -> la veille se dissipe, le clavier apparaît en vue d'ensemble
// inspect -> la caméra plonge au-dessus d'une zone, la culture s'active

export const Phase = Object.freeze({
  IDLE: 'idle',
  AWAKE: 'awake',
  INSPECT: 'inspect',
});

export class StateMachine extends EventTarget {
  constructor() {
    super();
    this._phase = Phase.IDLE;
    this._sinceChange = 0;
    this._idleTimer = 0;       // temps sans aucune interaction
    this.idleTimeout = 14.0;   // secondes avant retour en veille
  }

  get phase() { return this._phase; }
  get sinceChange() { return this._sinceChange; }

  to(phase) {
    if (phase === this._phase) return;
    const from = this._phase;
    this._phase = phase;
    this._sinceChange = 0;
    this.dispatchEvent(new CustomEvent('change', { detail: { from, to: phase } }));
  }

  // Toute interaction réveille la scène et remet le minuteur d'inactivité à zéro.
  poke() {
    this._idleTimer = 0;
    if (this._phase === Phase.IDLE) this.to(Phase.AWAKE);
  }

  update(dt) {
    this._sinceChange += dt;
    this._idleTimer += dt;

    // Retour en veille si plus rien ne bouge (sauf si on est en pleine inspection récente)
    if (this._phase !== Phase.IDLE && this._idleTimer > this.idleTimeout) {
      this.to(Phase.IDLE);
    }
  }
}
