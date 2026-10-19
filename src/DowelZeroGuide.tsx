import { useState } from 'react';
import { edgeZero, type Corner } from './dowel';
import { formatDistance, fromMm, inputToMm, type Unit } from './units';

type Measurement = { raw: string; unit: Unit };
const colors = ['#68717c', '#b68100', '#548e36', '#bf652b'];

export default function DowelZeroGuide({ unit }: { unit: Unit }) {
  const [corner, setCorner] = useState<Corner>('outside');
  const [diameter, setDiameter] = useState<Measurement>({ raw: '1/4', unit: 'in' });
  const [paper, setPaper] = useState<Measurement>({ raw: '0.004', unit: 'in' });
  const mm = (value: Measurement) => inputToMm(value.raw, value.unit);
  const display = (value: Measurement) => value.unit === unit || !value.raw.trim()
    ? value.raw : String(Number(fromMm(Number(mm(value)), unit).toFixed(10)));
  const result = edgeZero(mm(diameter), mm(paper), corner);
  const selected = corner === 'outside' ? [1, 2] : [3, 4];
  const signed = (value: number) => `${value >= 0 ? '+' : '−'}${formatDistance(Math.abs(value), unit)} ${unit}`;
  return <div className="edge-zero">
    <section className="card reference-card">
      <div className="section-heading"><h2>Pick your zero corner</h2><span className="view-tag">PAPER TOUCH-OFF</span></div>
      <p className="section-description">Viewed from the front: +X down / toward the front; +Y right. Use the side of a stationary pickup dowel, not its tip. Both zeros below are at a left/front corner.</p>
      <div className="corner-options" role="group" aria-label="Zero corner">
        <button className="button secondary" aria-pressed={corner === 'outside'} onClick={() => setCorner('outside')}>Outside corner · 1 + 2</button>
        <button className="button secondary" aria-pressed={corner === 'inside'} onClick={() => setCorner('inside')}>Inside corner · 3 + 4</button>
      </div>
      <div className="input-grid edge-inputs">
        <label htmlFor="dowel-diameter">Pickup dowel diameter<div className="input-with-unit"><input id="dowel-diameter" type="text" value={display(diameter)} onChange={(event) => setDiameter({ raw: event.target.value, unit })} /><span>{unit}</span></div></label>
        <label htmlFor="paper-thickness">Paper / feeler thickness<div className="input-with-unit"><input id="paper-thickness" type="text" value={display(paper)} onChange={(event) => setPaper({ raw: event.target.value, unit })} /><span>{unit}</span></div></label>
      </div>
      {unit === 'in' && <p className="section-description">Tip: enter fractions like 1/4 or mixed numbers like 1 3/8.</p>}
      {result.status === 'invalid' ? <p className="message error" role="alert">{result.message}</p> : <div className="edge-compensation" aria-live="polite"><span>Dowel radius + paper thickness</span><strong>{formatDistance(result.compensation, unit)} {unit}</strong><p>Defaults: ¼ inch dowel + 0.004 inch paper = 0.1290 inch compensation. Measure your actual paper; snag pressure affects repeatability.</p></div>}
    </section>
    <section className="card reference-card">
      <div className="section-heading"><h2>Match the contact to your reference</h2><span className="view-tag">TOP VIEW</span></div>
      <div className="edge-diagrams">
        <div><h3>Mach3 Select layout</h3><div className="select-layout" aria-label="Schematic Select button positions from your reference">{[3, 1, 4, 2].map((number) => <div key={number} className={`select-reference ${selected.includes(number) ? 'contact-active' : ''}`} style={{ borderColor: colors[number - 1], color: colors[number - 1] }}><strong>{number}</strong><span>Select</span></div>)}</div><p>Schematic of your screenshot, not live Mach3 controls.</p></div>
        <div><h3>Work surface contacts</h3><svg viewBox="0 0 420 310" role="img" aria-labelledby="edge-diagram-title">
          <title id="edge-diagram-title">Blue rectangular frame with contacts 1 outside front, 2 outside left, 3 inside left, 4 inside front. Selected zero is the {corner} left/front corner.</title>
          <path d="M50 48H115 M50 48V112" fill="none" stroke="#426da8" strokeWidth="3" /><text x="120" y="52">+Y</text><text x="40" y="132">+X</text>
          <path d="M90 80H365V250H90Z M135 115V210H325V115Z" fill="#4677bb" fillRule="evenodd" stroke="#335c96" />
          {[[120, 270], [70, 190], [150, 170], [205, 195]].map(([x, y], index) => <g key={index} opacity={selected.includes(index + 1) ? 1 : 0.4}><circle cx={x} cy={y} r="13" fill={colors[index]} /><text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="13">{index + 1}</text></g>)}
          <path d={corner === 'outside' ? 'M90 233V250H107' : 'M135 193V210H152'} fill="none" stroke="#153f33" strokeWidth="5" />
          <text x={corner === 'outside' ? 160 : 165} y={corner === 'outside' ? 295 : 235} fontSize="12" fill="#174b43">Selected zero</text>
        </svg></div>
      </div>
      <div className="message setup"><strong>Verify the Mach3 screen before using Select.</strong><p>The screen/wizard is unidentified. These numbers match your colored reference, but we have not verified what its Select buttons do or whether they compensate for diameter and paper. Do not assume they apply the values below. Do not apply compensation twice.</p></div>
    </section>
    <section className="card reference-card">
      <h2>Touch off one face at a time</h2>
      <p className="section-description">Use the intended work coordinate system with machine coordinates hidden. Keep the spindle stopped and prevent accidental start per the workshop procedure. Fit the approved dowel concentrically. Do not jog into solid contact or put fingers in a pinch point.</p>
      <ol className="workflow">
        <li><strong>Select the intended work coordinate system in Mach3.</strong></li>
        <li><strong>Position the dowel beside contact {corner === 'outside' ? '1 (outside front)' : '4 (inside front)'}.</strong><p>Approach the face at a clear, suitable height; retract clear before crossing an edge.</p></li>
        <li><strong>Place the paper between the dowel and the front face.</strong></li>
        <li><strong>Approach slowly along {corner === 'outside' ? '−X (toward the rear)' : '+X (toward the front)'} until the paper just snags.</strong><p>Use fine step jogging and stop at the first repeatable drag.</p></li>
        <li><strong>Identify Select {corner === 'outside' ? '1 (gray, upper right)' : '4 (orange, lower left)'} in your reference.</strong><p>Use it only after verifying the screen's behavior. Manual alternative: set the current work X DRO to the signed value below instead of pressing Zero X.</p>{result.status === 'valid' && <div className="procedure-adjustment"><span>Work X DRO at paper contact</span><strong>{signed(result.x)}</strong></div>}</li>
        <li><strong>Retract away from the front face.</strong></li>
        <li><strong>Position the dowel beside contact {corner === 'outside' ? '2 (outside left)' : '3 (inside left)'}.</strong></li>
        <li><strong>Place the paper between the dowel and the left face.</strong></li>
        <li><strong>Approach slowly along {corner === 'outside' ? '+Y (right)' : '−Y (left)'} until the paper just snags.</strong></li>
        <li><strong>Identify Select {corner === 'outside' ? '2 (yellow, lower right)' : '3 (green, upper left)'} in your reference.</strong><p>Use only with verified screen behavior. Manual alternative: set the current work Y DRO to the signed value below instead of pressing Zero Y.</p>{result.status === 'valid' && <div className="procedure-adjustment"><span>Work Y DRO at paper contact</span><strong>{signed(result.y)}</strong></div>}</li>
        <li><strong>Retract clear of the work.</strong></li>
        <li><strong>Verify the resulting work coordinates against both faces.</strong><p>The spindle center is offset by radius + paper at contact; do not command X0 Y0 at contact height. Use a clear Z height for any verification move.</p></li>
      </ol>
      <p className="section-description">This sets X/Y spindle-center zero at the selected corner, not Z zero. The manual values assume parallel dowel sides and square vertical faces. Match Mach3's active units to the displayed values. Defaults and edits here are not cloud-saved.</p>
    </section>
  </div>;
}
