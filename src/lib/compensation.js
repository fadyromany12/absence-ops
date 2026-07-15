/* Compensable hours.

   An RTA record can carry hours the agent is allowed to make up ("hours can be
   compensated"). Those offset the lost time before any discipline is assessed:
   fully compensated lost time is not a violation at all — the record is logged
   as Approved / Acknowledged and never enters the triage queue. Partial
   compensation shrinks the recorded lost time but the violation stands. */

export const AUTO_ACK_ACTION = "Approved / Acknowledged — lost time fully compensated";

/**
 * @param {{tardyMin?:number, missingMin?:number, earlyMin?:number, compMin?:number}} t
 * @returns {{lost:number, comp:number, net:number, fullyCompensated:boolean, partiallyCompensated:boolean}}
 *   lost — raw minutes lost (tardy + missing + early departure)
 *   comp — compensable minutes actually usable (never more than lost)
 *   net  — minutes still lost after compensation; what the case records
 */
export function applyCompensation({ tardyMin = 0, missingMin = 0, earlyMin = 0, compMin = 0 } = {}) {
  const lost = Math.max(0, tardyMin) + Math.max(0, missingMin) + Math.max(0, earlyMin);
  const comp = Math.min(Math.max(0, compMin), lost);
  const net = lost - comp;
  return {
    lost,
    comp,
    net,
    fullyCompensated: lost > 0 && net === 0,
    partiallyCompensated: comp > 0 && net > 0,
  };
}
