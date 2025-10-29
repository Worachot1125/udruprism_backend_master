// "use client";
// import { useDateRange, computePreset, type Preset } from "@/context/DateRangeContext";

// const pads = (n:number)=> n<10?`0${n}`:`${n}`;
// const toInput = (d:Date)=>`${d.getFullYear()}-${pads(d.getMonth()+1)}-${pads(d.getDate())}`;
// const fromInput = (s:string)=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,(m||1)-1,d||1);};

// export default function DateRangeFilter() {
//   const { value, setValue } = useDateRange();
//   const { preset, range } = value;

//   return (
//     <div className="flex flex-wrap items-center gap-2">
//       <select
//         className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-white/5 dark:text-gray-200"
//         value={preset}
//         onChange={(e) => {
//           const p = e.target.value as Preset;
//           setValue({ preset: p, range: p==="custom" ? range : computePreset(p) });
//         }}
//       >
//         <option value="last_day">Last day</option>
//         <option value="last_7">Last 7 days</option>
//         <option value="last_month">Last month</option>
//         <option value="last_quarter">Last quarter</option>
//         <option value="last_year">Last year</option>
//         <option value="custom">Custom range</option>
//       </select>

//       {preset === "custom" && (
//         <div className="flex items-center gap-2">
//           <input type="date" className="rounded-md border px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
//                  value={toInput(range.from)}
//                  onChange={(e)=>setValue({ preset:"custom", range: { from: fromInput(e.target.value), to: range.to }})}/>
//           <span className="text-gray-400">→</span>
//           <input type="date" className="rounded-md border px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
//                  value={toInput(range.to)}
//                  onChange={(e)=>setValue({ preset:"custom", range: { from: range.from, to: fromInput(e.target.value) }})}/>
//         </div>
//       )}
//     </div>
//   );
// }
