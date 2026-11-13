/* DevInventor Notes: verified topic library (English + Telugu).
 * Hand-written, checked content for core ECE / EEE topics. Each topic's
 * 2 / 5 / 8 / 10-mark answers are assembled from these verified parts, and
 */
(function (root) {
  "use strict";

  const T = [
    {
      id: "pn_diode", unit: "Electronic Devices", diagrams: ["pn_bias", "diode_vi"],
      title: "PN Junction Diode", title_te: "PN జంక్షన్ డయోడ్",
      en: {
        definition: "A PN junction diode is a two-terminal semiconductor device formed by joining P-type and N-type semiconductor. It allows current to flow easily in one direction (forward bias) and blocks it in the other direction (reverse bias).",
        points: [
          "The P side is the anode and the N side is the cathode.",
          "At the junction, electrons and holes recombine and form a depletion region with no free charge carriers.",
          "The depletion region creates a barrier potential of about 0.7 V for silicon and 0.3 V for germanium.",
          "Forward bias: P connected to + and N to −; the depletion region becomes narrow and current flows.",
          "Reverse bias: P connected to − and N to +; the depletion region becomes wide and only a tiny reverse saturation current flows.",
        ],
        working: [
          "In forward bias, the applied voltage opposes the barrier potential.",
          "When the applied voltage exceeds the knee (cut-in) voltage, the current increases rapidly (exponentially).",
          "In reverse bias, the applied voltage adds to the barrier, so majority carriers cannot cross the junction.",
          "Only minority carriers give a small reverse saturation current I₀ (in µA or nA).",
          "If the reverse voltage exceeds the breakdown voltage V_BR, the reverse current rises sharply (breakdown).",
        ],
        formulas: ["I = I₀ (e^(V / ηV_T) − 1)", "V_T = kT / q ≈ 26 mV at room temperature (300 K)", "η = 1 for Ge, η ≈ 2 for Si", "Static resistance R = V / I", "Dynamic resistance r_d = ΔV / ΔI ≈ ηV_T / I"],
        example: { q: "A silicon diode carries 26 mA in forward bias. Find its dynamic resistance (η = 1, V_T = 26 mV).", steps: ["r_d = ηV_T / I", "r_d = (1 × 26 mV) / 26 mA", "r_d = 1 Ω"] },
        advantages: ["Simple and cheap", "Very small size", "Fast switching (for small-signal diodes)"],
        disadvantages: ["Limited reverse voltage (breakdown)", "Current and leakage depend on temperature", "Has a forward voltage drop (≈0.7 V for Si)"],
        applications: ["Rectifiers (AC to DC)", "Clippers and clampers", "Reverse polarity protection", "Signal demodulation"],
        conclusion: "The PN junction diode conducts in forward bias and blocks in reverse bias, which makes it the basic building block of rectifiers and many electronic circuits.",
      },
      te: {
        definition: "P-type మరియు N-type సెమీకండక్టర్‌లను కలిపి తయారు చేసిన రెండు టెర్మినల్స్ ఉన్న పరికరమే PN జంక్షన్ డయోడ్. ఇది ఒక దిశలో (forward bias) కరెంట్‌ను సులభంగా ప్రవహింపజేస్తుంది, వ్యతిరేక దిశలో (reverse bias) అడ్డుకుంటుంది.",
        points: [
          "P వైపు ఆనోడ్ (Anode), N వైపు కాథోడ్ (Cathode).",
          "జంక్షన్ వద్ద ఎలక్ట్రాన్లు, హోల్స్ కలిసిపోయి free charges లేని depletion region ఏర్పడుతుంది.",
          "ఈ depletion region వల్ల barrier potential ఏర్పడుతుంది: సిలికాన్‌కు సుమారు 0.7 V, జెర్మేనియంకు 0.3 V.",
          "Forward bias: P ని + కి, N ని − కి కలుపుతాం; depletion region సన్నగా మారి కరెంట్ ప్రవహిస్తుంది.",
          "Reverse bias: P ని − కి, N ని + కి కలుపుతాం; depletion region వెడల్పుగా మారి చాలా చిన్న reverse saturation current మాత్రమే వస్తుంది.",
        ],
        working: [
          "Forward bias లో అప్లై చేసిన వోల్టేజ్ barrier potential ను వ్యతిరేకిస్తుంది.",
          "వోల్టేజ్ knee (cut-in) voltage దాటిన తర్వాత కరెంట్ వేగంగా (exponential గా) పెరుగుతుంది.",
          "Reverse bias లో వోల్టేజ్ barrier కు కలుస్తుంది, కాబట్టి majority carriers జంక్షన్ దాటలేవు.",
          "Minority carriers వల్ల మాత్రమే చిన్న reverse saturation current I₀ (µA లేదా nA లో) వస్తుంది.",
          "Reverse వోల్టేజ్ breakdown voltage V_BR దాటితే reverse current హఠాత్తుగా పెరుగుతుంది (breakdown).",
        ],
        example: { q: "Forward bias లో ఒక సిలికాన్ డయోడ్ ద్వారా 26 mA కరెంట్ వెళ్తోంది. దాని dynamic resistance కనుగొనండి (η = 1, V_T = 26 mV).", steps: ["r_d = ηV_T / I", "r_d = (1 × 26 mV) / 26 mA", "r_d = 1 Ω"] },
        advantages: ["సరళమైనది, చౌకైనది", "చాలా చిన్న పరిమాణం", "వేగంగా switching అవుతుంది"],
        disadvantages: ["Reverse వోల్టేజ్‌కు పరిమితి ఉంది (breakdown)", "ఉష్ణోగ్రతపై కరెంట్ ఆధారపడుతుంది", "Forward voltage drop ఉంటుంది (Si కి ≈0.7 V)"],
        applications: ["Rectifiers (AC ని DC గా మార్చడం)", "Clippers మరియు clampers", "Reverse polarity protection", "Signal demodulation"],
        conclusion: "PN జంక్షన్ డయోడ్ forward bias లో కరెంట్‌ను ప్రవహింపజేసి reverse bias లో అడ్డుకుంటుంది. అందుకే ఇది rectifiers మరియు అనేక ఎలక్ట్రానిక్ సర్క్యూట్లకు ప్రాథమిక భాగం.",
      },
      mcq: [
        { q: "The barrier potential of a silicon PN junction is about:", options: ["0.3 V", "0.7 V", "1.2 V", "5 V"], answer: 1, explain: "Silicon has a barrier (cut-in) voltage of about 0.7 V; germanium is about 0.3 V." },
        { q: "In reverse bias, the depletion region:", options: ["Becomes narrow", "Disappears", "Becomes wide", "Does not change"], answer: 2, explain: "Reverse voltage adds to the barrier, pulling carriers away from the junction, so the depletion region widens." },
        { q: "The thermal voltage V_T at room temperature (300 K) is about:", options: ["0.7 V", "26 mV", "2.6 V", "0.26 mV"], answer: 1, explain: "V_T = kT/q ≈ 26 mV at 300 K." },
      ],
    },
    {
      id: "zener", unit: "Electronic Devices", diagrams: ["zener_reg"],
      title: "Zener Diode as Voltage Regulator", title_te: "జీనర్ డయోడ్ వోల్టేజ్ రెగ్యులేటర్",
      en: {
        definition: "A Zener diode is a heavily doped PN junction diode designed to operate in the reverse breakdown region. In breakdown, the voltage across it stays almost constant at the Zener voltage V_Z, so it is used as a voltage regulator.",
        points: [
          "It is always connected in reverse bias in a regulator: cathode to the positive side.",
          "A series resistor R_S limits the current and drops the extra voltage.",
          "The load R_L is connected in parallel with the Zener diode.",
          "The output voltage V_o stays ≈ V_Z even if the input voltage or the load current changes.",
          "The Zener current must stay between I_Z(min) and I_Z(max) for proper regulation.",
        ],
        working: [
          "When V_in increases, the current through R_S increases.",
          "The extra current flows through the Zener diode (I_Z increases), and the extra voltage drops across R_S.",
          "So V_o remains equal to V_Z (line regulation).",
          "When the load current I_L increases, I_Z decreases by the same amount, so I_S and V_o stay constant (load regulation).",
          "Regulation fails if I_Z falls below I_Z(min) or exceeds the maximum power rating.",
        ],
        formulas: ["I_S = (V_in − V_Z) / R_S", "I_L = V_Z / R_L", "I_Z = I_S − I_L", "P_Z = V_Z × I_Z", "% Line regulation = (ΔV_o / ΔV_in) × 100"],
        example: { q: "V_in = 12 V, V_Z = 5.1 V, R_S = 220 Ω, R_L = 1 kΩ. Find I_S, I_L and I_Z.", steps: ["I_S = (12 − 5.1) / 220 = 6.9 / 220 = 31.4 mA", "I_L = 5.1 / 1000 = 5.1 mA", "I_Z = 31.4 − 5.1 = 26.3 mA"] },
        advantages: ["Simple and low cost", "Good regulation for small loads", "Few components"],
        disadvantages: ["Power is wasted in R_S and the Zener", "Not suitable for large load currents", "Output changes slightly with temperature"],
        applications: ["Voltage regulators in power supplies", "Reference voltage sources", "Over-voltage protection", "Waveform clipping"],
        conclusion: "A reverse-biased Zener diode with a series resistor keeps the output voltage nearly constant at V_Z against changes in input voltage and load.",
      },
      te: {
        definition: "Reverse breakdown region లో పని చేసేలా ఎక్కువ doping చేసిన PN జంక్షన్ డయోడ్‌నే జీనర్ డయోడ్ అంటారు. Breakdown లో దాని మీద వోల్టేజ్ దాదాపు స్థిరంగా జీనర్ వోల్టేజ్ V_Z వద్ద ఉంటుంది, అందుకే దీనిని వోల్టేజ్ రెగ్యులేటర్‌గా వాడతారు.",
        points: [
          "రెగ్యులేటర్‌లో ఇది ఎప్పుడూ reverse bias లో ఉంటుంది: కాథోడ్ పాజిటివ్ వైపు.",
          "Series resistor R_S కరెంట్‌ను పరిమితం చేసి అదనపు వోల్టేజ్‌ను తనపై తీసుకుంటుంది.",
          "Load R_L ను జీనర్ డయోడ్‌కు parallel గా కలుపుతాం.",
          "Input వోల్టేజ్ లేదా load కరెంట్ మారినా output V_o ≈ V_Z గానే ఉంటుంది.",
          "సరైన regulation కోసం జీనర్ కరెంట్ I_Z(min) మరియు I_Z(max) మధ్య ఉండాలి.",
        ],
        working: [
          "V_in పెరిగితే R_S ద్వారా కరెంట్ పెరుగుతుంది.",
          "ఆ అదనపు కరెంట్ జీనర్ ద్వారా వెళ్తుంది (I_Z పెరుగుతుంది), అదనపు వోల్టేజ్ R_S మీద పడుతుంది.",
          "కాబట్టి V_o = V_Z గా స్థిరంగా ఉంటుంది (line regulation).",
          "Load కరెంట్ I_L పెరిగితే I_Z అంతే తగ్గుతుంది, కాబట్టి I_S మరియు V_o మారవు (load regulation).",
          "I_Z, I_Z(min) కంటే తగ్గినా లేదా power rating దాటినా regulation పని చేయదు.",
        ],
        example: { q: "V_in = 12 V, V_Z = 5.1 V, R_S = 220 Ω, R_L = 1 kΩ. I_S, I_L, I_Z కనుగొనండి.", steps: ["I_S = (12 − 5.1) / 220 = 6.9 / 220 = 31.4 mA", "I_L = 5.1 / 1000 = 5.1 mA", "I_Z = 31.4 − 5.1 = 26.3 mA"] },
        advantages: ["సరళమైనది, తక్కువ ఖర్చు", "చిన్న loads కి మంచి regulation", "తక్కువ భాగాలు"],
        disadvantages: ["R_S మరియు జీనర్‌లో power వృథా అవుతుంది", "పెద్ద load కరెంట్‌కు సరిపోదు", "ఉష్ణోగ్రతతో output కొద్దిగా మారుతుంది"],
        applications: ["Power supplies లో వోల్టేజ్ రెగ్యులేటర్", "Reference వోల్టేజ్ సోర్స్", "Over-voltage protection", "Waveform clipping"],
        conclusion: "Series resistor తో reverse bias లో ఉన్న జీనర్ డయోడ్ input మరియు load మార్పులు ఉన్నా output వోల్టేజ్‌ను దాదాపు V_Z వద్ద స్థిరంగా ఉంచుతుంది.",
      },
      mcq: [
        { q: "In a voltage regulator, the Zener diode is connected in:", options: ["Forward bias", "Reverse bias", "Series with the load", "No bias"], answer: 1, explain: "The Zener works in reverse breakdown, so the cathode goes to the positive side." },
        { q: "If V_in = 10 V, V_Z = 6 V and R_S = 100 Ω, the series current I_S is:", options: ["40 mA", "60 mA", "100 mA", "16 mA"], answer: 0, explain: "I_S = (V_in − V_Z)/R_S = (10 − 6)/100 = 0.04 A = 40 mA." },
        { q: "When the load current increases in a Zener regulator, the Zener current:", options: ["Increases", "Decreases", "Stays the same", "Becomes zero always"], answer: 1, explain: "I_S is fixed by V_in, V_Z and R_S, so I_Z = I_S − I_L decreases when I_L increases." },
      ],
    },
    {
      id: "hwr", unit: "Electronic Devices", diagrams: ["hwr"],
      title: "Half-Wave Rectifier", title_te: "హాఫ్-వేవ్ రెక్టిఫైయర్",
      en: {
        definition: "A half-wave rectifier converts AC into pulsating DC by allowing only one half cycle (usually the positive half) of the input to pass through the load, using a single diode.",
        points: [
          "It uses one diode, a step-down transformer and a load resistor R_L.",
          "During the positive half cycle the diode is forward biased and conducts.",
          "During the negative half cycle the diode is reverse biased and does not conduct.",
          "The output is a series of positive half-sine pulses (pulsating DC).",
          "The ripple frequency equals the supply frequency (50 Hz for 50 Hz mains).",
        ],
        working: [
          "The transformer steps down the mains voltage to V_s = V_m sin ωt.",
          "Positive half: anode is positive, the diode conducts, current flows through R_L and V_o follows the input.",
          "Negative half: anode is negative, the diode is OFF, no current flows and V_o = 0.",
          "So only positive halves appear across the load.",
          "A filter capacitor can be added across R_L to smooth the output.",
        ],
        formulas: ["V_dc = V_m / π ≈ 0.318 V_m", "I_dc = I_m / π", "V_rms = V_m / 2", "Ripple factor γ = 1.21", "Efficiency η = 40.6 % (max)", "PIV = V_m", "Ripple frequency = f"],
        example: { q: "A half-wave rectifier gets 12 V (rms) from the transformer. Find V_m and V_dc (ideal diode).", steps: ["V_m = √2 × 12 = 16.97 V", "V_dc = V_m / π = 16.97 / 3.1416", "V_dc = 5.40 V"] },
        advantages: ["Simple, only one diode", "Low cost", "No centre-tapped transformer needed"],
        disadvantages: ["High ripple factor (1.21)", "Low efficiency (40.6 %)", "Transformer is under-used (DC saturation of core)", "Output DC is small"],
        applications: ["Low-power battery chargers", "Signal demodulation (AM detector)", "Simple low-cost supplies"],
        conclusion: "The half-wave rectifier is simple but inefficient; full-wave rectifiers are preferred for practical power supplies.",
      },
      te: {
        definition: "ఒకే డయోడ్ ఉపయోగించి input లో ఒక half cycle (సాధారణంగా positive half) ను మాత్రమే load ద్వారా వెళ్లనిచ్చి AC ని pulsating DC గా మార్చే సర్క్యూట్‌నే హాఫ్-వేవ్ రెక్టిఫైయర్ అంటారు.",
        points: [
          "ఇందులో ఒక డయోడ్, step-down transformer మరియు load resistor R_L ఉంటాయి.",
          "Positive half cycle లో డయోడ్ forward bias అయి కండక్ట్ చేస్తుంది.",
          "Negative half cycle లో డయోడ్ reverse bias అయి కండక్ట్ చేయదు.",
          "Output లో positive half-sine pulses మాత్రమే వస్తాయి (pulsating DC).",
          "Ripple frequency = supply frequency (50 Hz mains కు 50 Hz).",
        ],
        working: [
          "Transformer mains వోల్టేజ్‌ను V_s = V_m sin ωt గా తగ్గిస్తుంది.",
          "Positive half: ఆనోడ్ పాజిటివ్, డయోడ్ ON, R_L ద్వారా కరెంట్ వెళ్తుంది, V_o input ను అనుసరిస్తుంది.",
          "Negative half: ఆనోడ్ నెగటివ్, డయోడ్ OFF, కరెంట్ ఉండదు, V_o = 0.",
          "కాబట్టి load మీద positive halves మాత్రమే కనిపిస్తాయి.",
          "Output ను smooth చేయడానికి R_L కు parallel గా filter capacitor కలపవచ్చు.",
        ],
        example: { q: "Transformer నుండి 12 V (rms) వస్తోంది. V_m మరియు V_dc కనుగొనండి (ideal diode).", steps: ["V_m = √2 × 12 = 16.97 V", "V_dc = V_m / π = 16.97 / 3.1416", "V_dc = 5.40 V"] },
        advantages: ["సరళమైనది, ఒకే డయోడ్", "తక్కువ ఖర్చు", "Centre-tapped transformer అవసరం లేదు"],
        disadvantages: ["Ripple factor ఎక్కువ (1.21)", "Efficiency తక్కువ (40.6 %)", "Transformer పూర్తిగా ఉపయోగపడదు", "Output DC తక్కువ"],
        applications: ["తక్కువ power battery chargers", "AM detector (demodulation)", "చౌకైన చిన్న power supplies"],
        conclusion: "హాఫ్-వేవ్ రెక్టిఫైయర్ సరళమైనదే కానీ efficiency తక్కువ; అందుకే నిజమైన power supplies లో full-wave రెక్టిఫైయర్లను వాడతారు.",
      },
      mcq: [
        { q: "The ripple factor of a half-wave rectifier is:", options: ["0.482", "1.21", "0.812", "1.0"], answer: 1, explain: "For a half-wave rectifier γ = √((V_rms/V_dc)² − 1) = 1.21." },
        { q: "The maximum efficiency of a half-wave rectifier is:", options: ["81.2 %", "40.6 %", "50 %", "100 %"], answer: 1, explain: "η(max) = 4/π² ≈ 40.6 %." },
        { q: "PIV of the diode in a half-wave rectifier is:", options: ["V_m", "2V_m", "V_m/2", "V_m/π"], answer: 0, explain: "In the negative half the full peak V_m appears across the OFF diode." },
      ],
    },
    {
      id: "fwr_ct", unit: "Electronic Devices", diagrams: ["fwr_ct"],
      title: "Centre-Tapped Full-Wave Rectifier", title_te: "సెంటర్-ట్యాప్డ్ ఫుల్-వేవ్ రెక్టిఫైయర్",
      en: {
        definition: "A centre-tapped full-wave rectifier uses a centre-tapped transformer and two diodes to convert both half cycles of AC into pulsating DC in the same direction through the load.",
        points: [
          "The secondary winding has a centre tap (CT) which is the reference point.",
          "Each half of the secondary gives V_m sin ωt (with opposite phase).",
          "D₁ conducts in the positive half cycle and D₂ conducts in the negative half cycle.",
          "Current through R_L is in the same direction in both halves.",
          "Ripple frequency is twice the supply frequency (100 Hz for 50 Hz mains).",
        ],
        working: [
          "Positive half: the top end is positive w.r.t. CT, so D₁ is forward biased and D₂ is reverse biased.",
          "Current flows: top end → D₁ → R_L → CT.",
          "Negative half: the bottom end is positive w.r.t. CT, so D₂ is ON and D₁ is OFF.",
          "Current flows: bottom end → D₂ → R_L → CT, in the same direction through R_L.",
          "So the output has a pulse in every half cycle.",
        ],
        formulas: ["V_dc = 2V_m / π ≈ 0.636 V_m", "I_dc = 2I_m / π", "V_rms = V_m / √2", "Ripple factor γ = 0.482", "Efficiency η = 81.2 % (max)", "PIV = 2V_m", "Ripple frequency = 2f"],
        example: { q: "Each half of a centre-tapped secondary gives 12 V (rms). Find V_dc and the PIV of each diode (ideal diodes).", steps: ["V_m = √2 × 12 = 16.97 V", "V_dc = 2V_m / π = 2 × 16.97 / 3.1416 = 10.80 V", "PIV = 2V_m = 33.94 V"] },
        advantages: ["Higher V_dc and efficiency (81.2 %) than half-wave", "Lower ripple (0.482)", "Ripple frequency 2f is easier to filter"],
        disadvantages: ["Needs a centre-tapped transformer (costly, bulky)", "Each diode needs PIV of 2V_m", "Only half the secondary is used at a time"],
        applications: ["DC power supplies", "Battery chargers", "Adapters"],
        conclusion: "The centre-tapped full-wave rectifier uses both half cycles, giving double the DC output and much better efficiency than a half-wave rectifier.",
      },
      te: {
        definition: "Centre-tapped transformer మరియు రెండు డయోడ్లు ఉపయోగించి AC లోని రెండు half cycles నూ load ద్వారా ఒకే దిశలో వెళ్లే pulsating DC గా మార్చే సర్క్యూట్‌నే సెంటర్-ట్యాప్డ్ ఫుల్-వేవ్ రెక్టిఫైయర్ అంటారు.",
        points: [
          "Secondary winding కు మధ్యలో centre tap (CT) ఉంటుంది, అదే reference point.",
          "Secondary లో ప్రతి సగం V_m sin ωt ఇస్తుంది (వ్యతిరేక phase లో).",
          "Positive half లో D₁, negative half లో D₂ కండక్ట్ చేస్తాయి.",
          "రెండు halves లోనూ R_L ద్వారా కరెంట్ ఒకే దిశలో వెళ్తుంది.",
          "Ripple frequency supply frequency కి రెట్టింపు (50 Hz mains కు 100 Hz).",
        ],
        working: [
          "Positive half: పై చివర CT కంటే పాజిటివ్, కాబట్టి D₁ ON, D₂ OFF.",
          "కరెంట్ మార్గం: పై చివర → D₁ → R_L → CT.",
          "Negative half: కింది చివర CT కంటే పాజిటివ్, కాబట్టి D₂ ON, D₁ OFF.",
          "కరెంట్ మార్గం: కింది చివర → D₂ → R_L → CT, R_L లో అదే దిశలో.",
          "కాబట్టి ప్రతి half cycle లో output లో ఒక pulse వస్తుంది.",
        ],
        example: { q: "Centre-tapped secondary లో ప్రతి సగం 12 V (rms) ఇస్తుంది. V_dc మరియు ప్రతి డయోడ్ PIV కనుగొనండి.", steps: ["V_m = √2 × 12 = 16.97 V", "V_dc = 2V_m / π = 2 × 16.97 / 3.1416 = 10.80 V", "PIV = 2V_m = 33.94 V"] },
        advantages: ["హాఫ్-వేవ్ కంటే ఎక్కువ V_dc మరియు efficiency (81.2 %)", "తక్కువ ripple (0.482)", "2f ripple ను filter చేయడం సులభం"],
        disadvantages: ["Centre-tapped transformer అవసరం (ఖరీదు, పెద్దది)", "ప్రతి డయోడ్‌కు PIV = 2V_m కావాలి", "ఒకసారికి secondary లో సగమే వాడబడుతుంది"],
        applications: ["DC power supplies", "Battery chargers", "Adapters"],
        conclusion: "సెంటర్-ట్యాప్డ్ ఫుల్-వేవ్ రెక్టిఫైయర్ రెండు half cycles నూ వాడుతుంది, కాబట్టి హాఫ్-వేవ్ కంటే రెట్టింపు DC మరియు చాలా మంచి efficiency ఇస్తుంది.",
      },
      mcq: [
        { q: "The PIV of each diode in a centre-tapped full-wave rectifier is:", options: ["V_m", "2V_m", "V_m/2", "√2 V_m"], answer: 1, explain: "When one diode is OFF, the full secondary voltage 2V_m appears across it." },
        { q: "The ripple frequency of a full-wave rectifier on 50 Hz mains is:", options: ["25 Hz", "50 Hz", "100 Hz", "200 Hz"], answer: 2, explain: "Both halves give a pulse, so the ripple frequency is 2f = 100 Hz." },
        { q: "V_dc of a full-wave rectifier is:", options: ["V_m/π", "2V_m/π", "V_m/2", "V_m/√2"], answer: 1, explain: "Average of a full-wave rectified sine = 2V_m/π ≈ 0.636 V_m." },
      ],
    },
    {
      id: "bridge", unit: "Electronic Devices", diagrams: ["bridge"],
      title: "Bridge Rectifier", title_te: "బ్రిడ్జ్ రెక్టిఫైయర్",
      en: {
        definition: "A bridge rectifier is a full-wave rectifier that uses four diodes connected in a bridge. It converts both half cycles of AC into DC without needing a centre-tapped transformer.",
        points: [
          "Four diodes D₁–D₄ form a bridge; AC is applied to one diagonal and R_L is connected to the other.",
          "In each half cycle, two diodes conduct in series.",
          "Positive half: D₁ and D₂ conduct. Negative half: D₃ and D₄ conduct.",
          "Current through R_L is in the same direction in both halves.",
          "Each diode needs a PIV of only V_m.",
        ],
        working: [
          "Positive half: the top node T is positive; current flows T → D₁ → R_L → D₂ → back to the transformer.",
          "D₃ and D₄ are reverse biased during this half.",
          "Negative half: the bottom node B is positive; current flows B → D₃ → R_L → D₄ → back.",
          "D₁ and D₂ are reverse biased during this half.",
          "In both halves current enters R_L from the same (+) end, giving full-wave DC.",
        ],
        formulas: ["V_dc = 2V_m / π (ideal)", "V_dc ≈ 2(V_m − 2V_D) / π (with two diode drops)", "V_rms = V_m / √2", "Ripple factor γ = 0.482", "Efficiency η = 81.2 % (max)", "PIV = V_m", "Ripple frequency = 2f"],
        example: { q: "A bridge rectifier gets 12 V (rms). Find V_dc for ideal diodes and with silicon diodes (0.7 V each).", steps: ["V_m = √2 × 12 = 16.97 V", "Ideal: V_dc = 2 × 16.97 / π = 10.80 V", "With Si: V_m' = 16.97 − 1.4 = 15.57 V, V_dc = 2 × 15.57 / π = 9.91 V"] },
        advantages: ["No centre-tapped transformer needed", "PIV of each diode is only V_m", "Full transformer secondary is used", "Efficiency 81.2 % and ripple 0.482"],
        disadvantages: ["Needs four diodes", "Two diode drops (≈1.4 V) reduce the output", "Slightly more power loss in diodes"],
        applications: ["Almost all DC power supplies and adapters", "Battery chargers", "Welding and motor drive supplies"],
        conclusion: "The bridge rectifier gives full-wave output with a simple transformer and low diode PIV, which is why it is the most widely used rectifier.",
      },
      te: {
        definition: "Bridge రూపంలో కలిపిన నాలుగు డయోడ్లు ఉపయోగించే ఫుల్-వేవ్ రెక్టిఫైయర్‌నే బ్రిడ్జ్ రెక్టిఫైయర్ అంటారు. ఇది centre-tapped transformer అవసరం లేకుండా AC లోని రెండు half cycles నూ DC గా మారుస్తుంది.",
        points: [
          "D₁–D₄ నాలుగు డయోడ్లు bridge గా ఉంటాయి; AC ఒక diagonal కి, R_L మరో diagonal కి కలుపుతాం.",
          "ప్రతి half cycle లో రెండు డయోడ్లు series లో కండక్ట్ చేస్తాయి.",
          "Positive half: D₁, D₂ కండక్ట్ చేస్తాయి. Negative half: D₃, D₄ కండక్ట్ చేస్తాయి.",
          "రెండు halves లోనూ R_L ద్వారా కరెంట్ ఒకే దిశలో వెళ్తుంది.",
          "ప్రతి డయోడ్‌కు PIV V_m మాత్రమే సరిపోతుంది.",
        ],
        working: [
          "Positive half: పై node T పాజిటివ్; కరెంట్ T → D₁ → R_L → D₂ → transformer కు తిరిగి.",
          "ఈ సమయంలో D₃, D₄ reverse bias లో ఉంటాయి.",
          "Negative half: కింది node B పాజిటివ్; కరెంట్ B → D₃ → R_L → D₄ → తిరిగి.",
          "ఈ సమయంలో D₁, D₂ reverse bias లో ఉంటాయి.",
          "రెండు halves లోనూ కరెంట్ R_L లోకి ఒకే (+) చివర నుండి ప్రవేశిస్తుంది, కాబట్టి full-wave DC వస్తుంది.",
        ],
        example: { q: "బ్రిడ్జ్ రెక్టిఫైయర్‌కు 12 V (rms) వస్తోంది. Ideal డయోడ్లకు, సిలికాన్ డయోడ్లకు (ఒక్కోదానికి 0.7 V) V_dc కనుగొనండి.", steps: ["V_m = √2 × 12 = 16.97 V", "Ideal: V_dc = 2 × 16.97 / π = 10.80 V", "Si తో: V_m' = 16.97 − 1.4 = 15.57 V, V_dc = 2 × 15.57 / π = 9.91 V"] },
        advantages: ["Centre-tapped transformer అవసరం లేదు", "ప్రతి డయోడ్ PIV = V_m మాత్రమే", "Transformer secondary పూర్తిగా వాడబడుతుంది", "Efficiency 81.2 %, ripple 0.482"],
        disadvantages: ["నాలుగు డయోడ్లు కావాలి", "రెండు diode drops (≈1.4 V) వల్ల output తగ్గుతుంది", "డయోడ్లలో కొంచెం ఎక్కువ power loss"],
        applications: ["దాదాపు అన్ని DC power supplies, adapters", "Battery chargers", "Welding, motor drive supplies"],
        conclusion: "బ్రిడ్జ్ రెక్టిఫైయర్ సాధారణ transformer మరియు తక్కువ PIV తో full-wave output ఇస్తుంది; అందుకే ఇది ఎక్కువగా వాడే రెక్టిఫైయర్.",
      },
      mcq: [
        { q: "How many diodes conduct at a time in a bridge rectifier?", options: ["One", "Two", "Three", "Four"], answer: 1, explain: "In each half cycle two diodes conduct in series (D₁, D₂ or D₃, D₄)." },
        { q: "The PIV of each diode in a bridge rectifier is:", options: ["V_m", "2V_m", "V_m/2", "4V_m"], answer: 0, explain: "Each OFF diode sees only the peak secondary voltage V_m." },
        { q: "The main advantage of a bridge rectifier over a centre-tapped one is:", options: ["Fewer diodes", "No centre-tapped transformer needed", "Higher ripple", "Lower efficiency"], answer: 1, explain: "It gives full-wave output with an ordinary transformer and diodes rated for only V_m." },
      ],
    },
    {
      id: "npn", unit: "Electronic Devices", diagrams: ["npn"],
      title: "NPN Transistor", title_te: "NPN ట్రాన్సిస్టర్",
      en: {
        definition: "An NPN transistor is a bipolar junction transistor (BJT) with a thin, lightly doped P-type base between two N-type regions, the emitter and the collector. A small base current controls a much larger collector current.",
        points: [
          "Three terminals: emitter (E), base (B) and collector (C).",
          "The emitter is heavily doped, the base is thin and lightly doped, and the collector is moderately doped and largest.",
          "In the symbol, the emitter arrow points OUT (from base to emitter).",
          "Active region: base-emitter junction forward biased, collector-base junction reverse biased.",
          "Majority carriers are electrons; conventional current flows into the collector and base and out of the emitter.",
        ],
        working: [
          "V_BB forward biases the B-E junction, so electrons are injected from the emitter into the base.",
          "The base is thin and lightly doped, so only a few electrons (≈1–2 %) recombine and form the base current I_B.",
          "Most electrons are swept into the collector by the reverse-biased C-B junction, forming I_C.",
          "So I_C = β I_B, and a small change in I_B gives a large change in I_C (amplification).",
          "In the CE configuration the emitter is common to the input and output circuits.",
        ],
        formulas: ["I_E = I_B + I_C", "I_C = β I_B", "α = I_C / I_E", "β = α / (1 − α)", "α = β / (1 + β)", "V_BE ≈ 0.7 V (Si) in the active region"],
        example: { q: "For an NPN transistor, β = 100 and I_B = 20 µA. Find I_C, I_E and α.", steps: ["I_C = β I_B = 100 × 20 µA = 2 mA", "I_E = I_B + I_C = 0.02 + 2 = 2.02 mA", "α = I_C / I_E = 2 / 2.02 = 0.990"] },
        advantages: ["High current gain", "Electrons move faster than holes, so NPN is faster than PNP", "Works with positive supply (common in circuits)"],
        disadvantages: ["Characteristics depend on temperature", "Needs proper biasing", "Can enter thermal runaway without stabilisation"],
        applications: ["Amplifiers", "Electronic switches (relay and LED drivers)", "Oscillators", "Digital logic circuits"],
        conclusion: "In the NPN transistor a small base current controls a large collector current, which makes it useful as an amplifier and a switch.",
      },
      te: {
        definition: "రెండు N-type ప్రాంతాల (emitter, collector) మధ్య సన్నని, తక్కువ doping ఉన్న P-type base ఉన్న bipolar junction transistor (BJT) నే NPN ట్రాన్సిస్టర్ అంటారు. చిన్న base కరెంట్ చాలా పెద్ద collector కరెంట్‌ను నియంత్రిస్తుంది.",
        points: [
          "మూడు టెర్మినల్స్: emitter (E), base (B), collector (C).",
          "Emitter ఎక్కువ doping, base సన్నగా తక్కువ doping, collector మధ్యస్థ doping తో అన్నిటికంటే పెద్దది.",
          "Symbol లో emitter arrow బయటకు (base నుండి emitter వైపు) చూపుతుంది.",
          "Active region: base-emitter junction forward bias, collector-base junction reverse bias.",
          "Majority carriers ఎలక్ట్రాన్లు; conventional కరెంట్ collector, base లోకి ప్రవేశించి emitter నుండి బయటకు వస్తుంది.",
        ],
        working: [
          "V_BB, B-E junction ను forward bias చేస్తుంది, కాబట్టి emitter నుండి base లోకి ఎలక్ట్రాన్లు వెళ్తాయి.",
          "Base సన్నగా, తక్కువ doping తో ఉండటం వల్ల కొద్ది ఎలక్ట్రాన్లు (≈1–2 %) మాత్రమే recombine అయి I_B అవుతాయి.",
          "మిగతా ఎలక్ట్రాన్లను reverse bias లో ఉన్న C-B junction collector లోకి లాగుతుంది, అదే I_C.",
          "కాబట్టి I_C = β I_B; I_B లో చిన్న మార్పు I_C లో పెద్ద మార్పు ఇస్తుంది (amplification).",
          "CE configuration లో emitter input మరియు output రెండింటికీ common.",
        ],
        example: { q: "NPN ట్రాన్సిస్టర్‌కు β = 100, I_B = 20 µA. I_C, I_E, α కనుగొనండి.", steps: ["I_C = β I_B = 100 × 20 µA = 2 mA", "I_E = I_B + I_C = 0.02 + 2 = 2.02 mA", "α = I_C / I_E = 2 / 2.02 = 0.990"] },
        advantages: ["ఎక్కువ current gain", "ఎలక్ట్రాన్లు హోల్స్ కంటే వేగంగా కదులుతాయి, కాబట్టి NPN వేగంగా పని చేస్తుంది", "Positive supply తో పని చేస్తుంది"],
        disadvantages: ["లక్షణాలు ఉష్ణోగ్రతపై ఆధారపడతాయి", "సరైన biasing అవసరం", "Stabilisation లేకపోతే thermal runaway రావచ్చు"],
        applications: ["Amplifiers", "Electronic switches (relay, LED drivers)", "Oscillators", "Digital logic circuits"],
        conclusion: "NPN ట్రాన్సిస్టర్‌లో చిన్న base కరెంట్ పెద్ద collector కరెంట్‌ను నియంత్రిస్తుంది, అందుకే ఇది amplifier మరియు switch గా ఉపయోగపడుతుంది.",
      },
      mcq: [
        { q: "In an NPN transistor symbol, the emitter arrow:", options: ["Points into the base", "Points out of the emitter", "Is on the collector", "Is absent"], answer: 1, explain: "NPN: arrow points out (Not Pointing iN). PNP: arrow points in." },
        { q: "If β = 50 and I_B = 40 µA, then I_C is:", options: ["2 mA", "0.8 mA", "20 mA", "1.25 mA"], answer: 0, explain: "I_C = β I_B = 50 × 40 µA = 2000 µA = 2 mA." },
        { q: "For a transistor in the active region:", options: ["Both junctions forward biased", "Both junctions reverse biased", "B-E forward, C-B reverse", "B-E reverse, C-B forward"], answer: 2, explain: "Active (amplifier) region needs the emitter junction forward biased and the collector junction reverse biased." },
      ],
    },
    {
      id: "pnp", unit: "Electronic Devices", diagrams: ["pnp"],
      title: "PNP Transistor", title_te: "PNP ట్రాన్సిస్టర్",
      en: {
        definition: "A PNP transistor is a BJT with a thin N-type base between a P-type emitter and a P-type collector. Its majority carriers are holes, and its supply polarities and current directions are opposite to an NPN transistor.",
        points: [
          "Three terminals: emitter (E), base (B) and collector (C).",
          "In the symbol, the emitter arrow points IN (from emitter to base).",
          "Active region: B-E junction forward biased (emitter more positive than base), C-B junction reverse biased.",
          "Base and collector are negative with respect to the emitter.",
          "Conventional current enters the emitter and leaves the base and collector.",
        ],
        working: [
          "Forward bias on the B-E junction injects holes from the emitter into the base.",
          "Only a few holes recombine in the thin, lightly doped base, forming I_B.",
          "Most holes are collected by the reverse-biased C-B junction, forming I_C.",
          "The same current relations as NPN apply: I_E = I_B + I_C and I_C = β I_B.",
          "PNP transistors are often used where the load must be switched from the positive supply.",
        ],
        formulas: ["I_E = I_B + I_C", "I_C = β I_B", "α = I_C / I_E", "β = α / (1 − α)", "V_EB ≈ 0.7 V (Si) in the active region"],
        example: { q: "A PNP transistor has α = 0.98 and I_E = 5 mA. Find I_C, I_B and β.", steps: ["I_C = α I_E = 0.98 × 5 = 4.9 mA", "I_B = I_E − I_C = 5 − 4.9 = 0.1 mA", "β = I_C / I_B = 4.9 / 0.1 = 49"] },
        advantages: ["Useful for high-side switching (load to ground)", "Complements NPN in push-pull amplifiers", "Simple interface with negative-ground signals"],
        disadvantages: ["Holes are slower than electrons, so it is slower than NPN", "Lower gain-bandwidth than a similar NPN", "Fewer types available"],
        applications: ["Push-pull (complementary) amplifiers", "High-side switches", "Current sources", "Voltage regulators"],
        conclusion: "The PNP transistor works like an NPN with reversed polarities and current directions, and is commonly paired with NPN transistors.",
      },
      te: {
        definition: "P-type emitter మరియు P-type collector మధ్య సన్నని N-type base ఉన్న BJT నే PNP ట్రాన్సిస్టర్ అంటారు. దీనిలో majority carriers హోల్స్; supply polarities, కరెంట్ దిశలు NPN కు వ్యతిరేకంగా ఉంటాయి.",
        points: [
          "మూడు టెర్మినల్స్: emitter (E), base (B), collector (C).",
          "Symbol లో emitter arrow లోపలికి (emitter నుండి base వైపు) చూపుతుంది.",
          "Active region: B-E junction forward bias (emitter base కంటే పాజిటివ్), C-B junction reverse bias.",
          "Base మరియు collector, emitter కంటే నెగటివ్‌గా ఉంటాయి.",
          "Conventional కరెంట్ emitter లోకి ప్రవేశించి base, collector నుండి బయటకు వస్తుంది.",
        ],
        working: [
          "B-E junction forward bias వల్ల emitter నుండి base లోకి హోల్స్ వెళ్తాయి.",
          "సన్నని, తక్కువ doping ఉన్న base లో కొద్ది హోల్స్ మాత్రమే recombine అయి I_B అవుతాయి.",
          "ఎక్కువ హోల్స్‌ను reverse bias లో ఉన్న C-B junction సేకరిస్తుంది, అదే I_C.",
          "NPN కు ఉన్న సూత్రాలే వర్తిస్తాయి: I_E = I_B + I_C, I_C = β I_B.",
          "Positive supply నుండి load ను switch చేయాల్సిన చోట PNP ను ఎక్కువగా వాడతారు.",
        ],
        example: { q: "PNP ట్రాన్సిస్టర్‌కు α = 0.98, I_E = 5 mA. I_C, I_B, β కనుగొనండి.", steps: ["I_C = α I_E = 0.98 × 5 = 4.9 mA", "I_B = I_E − I_C = 5 − 4.9 = 0.1 mA", "β = I_C / I_B = 4.9 / 0.1 = 49"] },
        advantages: ["High-side switching కు ఉపయోగకరం", "Push-pull amplifiers లో NPN కు జతగా", "Negative-ground signals తో సులభంగా కలుస్తుంది"],
        disadvantages: ["హోల్స్ ఎలక్ట్రాన్ల కంటే నెమ్మదిగా కదులుతాయి, కాబట్టి NPN కంటే నెమ్మది", "అదే NPN కంటే gain-bandwidth తక్కువ", "తక్కువ రకాలు అందుబాటులో ఉంటాయి"],
        applications: ["Push-pull (complementary) amplifiers", "High-side switches", "Current sources", "Voltage regulators"],
        conclusion: "PNP ట్రాన్సిస్టర్ వ్యతిరేక polarities, కరెంట్ దిశలతో NPN లాగే పని చేస్తుంది; దీనిని తరచుగా NPN తో జతగా వాడతారు.",
      },
      mcq: [
        { q: "In a PNP transistor, the majority carriers are:", options: ["Electrons", "Holes", "Ions", "Protons"], answer: 1, explain: "The emitter is P-type, so holes are injected and carry most of the current." },
        { q: "In the PNP symbol, the emitter arrow points:", options: ["Outward", "Inward (towards the base)", "Towards the collector", "Nowhere"], answer: 1, explain: "PNP: Pointing iN Proudly. The arrow shows conventional current entering the emitter." },
        { q: "α = 0.99 corresponds to β of:", options: ["9.9", "99", "0.99", "990"], answer: 1, explain: "β = α/(1 − α) = 0.99/0.01 = 99." },
      ],
    },
    {
      id: "vdiv", unit: "Circuit Theory", diagrams: ["vdiv"],
      title: "Voltage Divider Rule", title_te: "వోల్టేజ్ డివైడర్ రూల్",
      en: {
        definition: "The voltage divider rule gives the voltage across any resistor in a series circuit: it equals the total voltage multiplied by that resistance divided by the total series resistance.",
        points: [
          "It applies to resistors connected in series (same current through all).",
          "The total voltage divides in proportion to the resistances.",
          "A bigger resistor gets a bigger share of the voltage.",
          "It is valid only when no load draws current from the divider point (or the load is included in the calculation).",
        ],
        working: [
          "Series current I = V_in / (R₁ + R₂).",
          "Voltage across R₂ = I × R₂ (Ohm's law).",
          "Substituting I gives V_out = V_in × R₂ / (R₁ + R₂).",
          "If a load R_L is connected across R₂, use R₂ ∥ R_L in place of R₂.",
        ],
        formulas: ["V_R2 = V_in × R₂ / (R₁ + R₂)", "V_R1 = V_in × R₁ / (R₁ + R₂)", "I = V_in / (R₁ + R₂)", "For n resistors: V_k = V × R_k / ΣR"],
        example: { q: "V_in = 12 V, R₁ = 10 kΩ, R₂ = 5 kΩ. Find V_out across R₂.", steps: ["R_total = 10 + 5 = 15 kΩ", "V_out = 12 × 5 / 15", "V_out = 4 V (and V_R1 = 8 V)"] },
        advantages: ["Quick calculation without finding current", "Simple way to get a smaller voltage", "Used to set bias voltages"],
        disadvantages: ["Output changes when a load is connected", "Wastes power in the resistors", "Not suitable for supplying large currents"],
        applications: ["Transistor biasing", "Sensor circuits (LDR, thermistor)", "Potentiometers and volume controls", "Reference voltages for ADCs"],
        conclusion: "The voltage divider rule quickly gives the voltage across a resistor in series and is widely used for biasing and sensing.",
      },
      te: {
        definition: "Series సర్క్యూట్‌లో ఏదైనా resistor మీద వోల్టేజ్ = మొత్తం వోల్టేజ్ × ఆ resistance ÷ మొత్తం series resistance. దీనినే వోల్టేజ్ డివైడర్ రూల్ అంటారు.",
        points: [
          "ఇది series లో ఉన్న resistors కు వర్తిస్తుంది (అన్నిటి ద్వారా ఒకే కరెంట్).",
          "మొత్తం వోల్టేజ్ resistances నిష్పత్తిలో పంచబడుతుంది.",
          "పెద్ద resistor కు ఎక్కువ వోల్టేజ్ వస్తుంది.",
          "Divider point నుండి load కరెంట్ తీసుకోనప్పుడు మాత్రమే ఇది సరిగ్గా వర్తిస్తుంది (లేదా load ను లెక్కలో చేర్చాలి).",
        ],
        working: [
          "Series కరెంట్ I = V_in / (R₁ + R₂).",
          "R₂ మీద వోల్టేజ్ = I × R₂ (Ohm's law).",
          "I ని ప్రతిక్షేపిస్తే V_out = V_in × R₂ / (R₁ + R₂).",
          "R₂ కు load R_L కలిపితే R₂ బదులు R₂ ∥ R_L వాడాలి.",
        ],
        example: { q: "V_in = 12 V, R₁ = 10 kΩ, R₂ = 5 kΩ. R₂ మీద V_out కనుగొనండి.", steps: ["R_total = 10 + 5 = 15 kΩ", "V_out = 12 × 5 / 15", "V_out = 4 V (V_R1 = 8 V)"] },
        advantages: ["కరెంట్ కనుగొనకుండానే త్వరగా లెక్కించవచ్చు", "తక్కువ వోల్టేజ్ పొందడానికి సులభమైన మార్గం", "Bias వోల్టేజ్‌లు సెట్ చేయడానికి వాడతారు"],
        disadvantages: ["Load కలిపితే output మారుతుంది", "Resistors లో power వృథా", "ఎక్కువ కరెంట్ ఇవ్వడానికి పనికిరాదు"],
        applications: ["ట్రాన్సిస్టర్ biasing", "Sensor circuits (LDR, thermistor)", "Potentiometers, volume controls", "ADC లకు reference వోల్టేజ్"],
        conclusion: "వోల్టేజ్ డివైడర్ రూల్ series లో ఉన్న resistor మీద వోల్టేజ్‌ను త్వరగా ఇస్తుంది; biasing, sensing లో విస్తృతంగా వాడతారు.",
      },
      mcq: [
        { q: "V_in = 9 V, R₁ = 2 kΩ, R₂ = 1 kΩ. Voltage across R₂ is:", options: ["3 V", "6 V", "4.5 V", "9 V"], answer: 0, explain: "V_R2 = 9 × 1/(2+1) = 3 V." },
        { q: "The voltage divider rule applies to resistors in:", options: ["Parallel", "Series", "Delta", "Any connection"], answer: 1, explain: "The same current must flow through the resistors, i.e. they must be in series." },
        { q: "Connecting a load across R₂ makes V_out:", options: ["Increase", "Decrease", "Stay the same", "Double"], answer: 1, explain: "R₂ ∥ R_L is smaller than R₂, so its share of the voltage falls." },
      ],
    },
    {
      id: "idiv", unit: "Circuit Theory", diagrams: ["idiv"],
      title: "Current Divider Rule", title_te: "కరెంట్ డివైడర్ రూల్",
      en: {
        definition: "The current divider rule gives the current in each branch of a parallel circuit: for two resistors, the current in one branch equals the total current multiplied by the OTHER resistance divided by the sum of the two resistances.",
        points: [
          "It applies to resistors connected in parallel (same voltage across all).",
          "The total current divides inversely with resistance.",
          "The smaller resistor carries the larger current.",
          "The sum of the branch currents equals the total current (KCL).",
        ],
        working: [
          "Voltage across the parallel pair V = I × (R₁ ∥ R₂) = I × R₁R₂ / (R₁ + R₂).",
          "Current in R₁: I₁ = V / R₁ = I × R₂ / (R₁ + R₂).",
          "Current in R₂: I₂ = V / R₂ = I × R₁ / (R₁ + R₂).",
          "For more branches use conductance: I_k = I × G_k / ΣG.",
        ],
        formulas: ["I₁ = I × R₂ / (R₁ + R₂)", "I₂ = I × R₁ / (R₁ + R₂)", "R_eq = R₁R₂ / (R₁ + R₂)", "I_k = I × G_k / ΣG (G = 1/R)"],
        example: { q: "I = 6 mA flows into R₁ = 1 kΩ in parallel with R₂ = 2 kΩ. Find I₁ and I₂.", steps: ["I₁ = 6 × 2 / (1 + 2) = 4 mA", "I₂ = 6 × 1 / (1 + 2) = 2 mA", "Check: I₁ + I₂ = 6 mA ✓"] },
        advantages: ["Finds branch currents without finding voltage", "Simple for two branches", "Checks results with KCL"],
        disadvantages: ["Only for parallel branches", "Becomes long for many branches (use conductance)", "Needs the total current to be known"],
        applications: ["Ammeter shunt design", "Current sharing in parallel circuits", "Circuit analysis problems"],
        conclusion: "The current divider rule quickly splits a known current between parallel branches; the smaller resistance always takes the larger current.",
      },
      te: {
        definition: "Parallel సర్క్యూట్‌లో ప్రతి branch లో కరెంట్‌ను ఇచ్చే నియమమే కరెంట్ డివైడర్ రూల్. రెండు resistors ఉంటే, ఒక branch కరెంట్ = మొత్తం కరెంట్ × మరో resistance ÷ రెండు resistances మొత్తం.",
        points: [
          "ఇది parallel లో ఉన్న resistors కు వర్తిస్తుంది (అన్నిటి మీద ఒకే వోల్టేజ్).",
          "మొత్తం కరెంట్ resistance కు విలోమ నిష్పత్తిలో పంచబడుతుంది.",
          "చిన్న resistor ద్వారా ఎక్కువ కరెంట్ వెళ్తుంది.",
          "Branch కరెంట్ల మొత్తం = మొత్తం కరెంట్ (KCL).",
        ],
        working: [
          "Parallel జత మీద వోల్టేజ్ V = I × (R₁ ∥ R₂) = I × R₁R₂ / (R₁ + R₂).",
          "R₁ లో కరెంట్: I₁ = V / R₁ = I × R₂ / (R₁ + R₂).",
          "R₂ లో కరెంట్: I₂ = V / R₂ = I × R₁ / (R₁ + R₂).",
          "ఎక్కువ branches ఉంటే conductance వాడాలి: I_k = I × G_k / ΣG.",
        ],
        example: { q: "I = 6 mA కరెంట్ parallel లో ఉన్న R₁ = 1 kΩ, R₂ = 2 kΩ లోకి వెళ్తోంది. I₁, I₂ కనుగొనండి.", steps: ["I₁ = 6 × 2 / (1 + 2) = 4 mA", "I₂ = 6 × 1 / (1 + 2) = 2 mA", "Check: I₁ + I₂ = 6 mA ✓"] },
        advantages: ["వోల్టేజ్ కనుగొనకుండానే branch కరెంట్లు", "రెండు branches కు సరళం", "KCL తో సరిచూసుకోవచ్చు"],
        disadvantages: ["Parallel branches కు మాత్రమే", "ఎక్కువ branches అయితే పొడవుగా ఉంటుంది", "మొత్తం కరెంట్ తెలిసి ఉండాలి"],
        applications: ["Ammeter shunt design", "Parallel circuits లో కరెంట్ పంపిణీ", "Circuit analysis లెక్కలు"],
        conclusion: "కరెంట్ డివైడర్ రూల్ తెలిసిన కరెంట్‌ను parallel branches మధ్య త్వరగా పంచుతుంది; చిన్న resistance కు ఎప్పుడూ ఎక్కువ కరెంట్ వస్తుంది.",
      },
      mcq: [
        { q: "I = 9 A divides between R₁ = 3 Ω and R₂ = 6 Ω in parallel. I₁ is:", options: ["3 A", "6 A", "4.5 A", "9 A"], answer: 1, explain: "I₁ = 9 × 6/(3+6) = 6 A. The smaller resistor carries more current." },
        { q: "In a parallel circuit, the larger resistor carries:", options: ["More current", "Less current", "Equal current", "No current"], answer: 1, explain: "Current divides inversely with resistance." },
        { q: "The current divider rule applies to resistors in:", options: ["Series", "Parallel", "Star", "Any network"], answer: 1, explain: "All branches must have the same voltage across them, i.e. be in parallel." },
      ],
    },
    {
      id: "kcl", unit: "Circuit Theory", diagrams: ["kcl"],
      title: "Kirchhoff's Current Law (KCL)", title_te: "కిర్చాఫ్ కరెంట్ నియమం (KCL)",
      en: {
        definition: "Kirchhoff's Current Law states that the algebraic sum of currents meeting at any node is zero. In other words, the total current entering a node equals the total current leaving it.",
        points: [
          "It is based on the law of conservation of charge.",
          "A node is a point where two or more circuit elements meet.",
          "Sign convention: currents entering are taken + and leaving are taken − (or vice versa).",
          "It is the basis of nodal analysis.",
        ],
        working: [
          "Mark all currents at the node with assumed directions.",
          "Write Σ I_in = Σ I_out (or Σ I = 0 with signs).",
          "Solve for the unknown current.",
          "A negative answer means the actual direction is opposite to the assumed one.",
        ],
        formulas: ["Σ I = 0 at a node", "Σ I_entering = Σ I_leaving", "Example node: I₁ + I₂ = I₃ + I₄"],
        example: { q: "At a node, I₁ = 5 A and I₂ = 3 A enter, I₃ = 6 A leaves. Find I₄ (leaving).", steps: ["Σ I_in = Σ I_out", "5 + 3 = 6 + I₄", "I₄ = 2 A (leaving)"] },
        advantages: ["Works for any network (linear or non-linear)", "Simple and always true at a node", "Basis of nodal analysis"],
        disadvantages: ["Assumes lumped circuits (not valid at very high frequencies)", "Needs careful sign convention", "Many nodes give many equations"],
        applications: ["Nodal analysis", "Current distribution in networks", "Checking circuit calculations"],
        conclusion: "KCL says charge is not stored at a node, so the current entering a node always equals the current leaving it.",
      },
      te: {
        definition: "ఏదైనా node వద్ద కలిసే కరెంట్ల బీజీయ మొత్తం సున్నా అని కిర్చాఫ్ కరెంట్ నియమం చెబుతుంది. అంటే node లోకి ప్రవేశించే మొత్తం కరెంట్ = node నుండి బయటకు వెళ్లే మొత్తం కరెంట్.",
        points: [
          "ఇది charge పరిరక్షణ నియమం (conservation of charge) పై ఆధారపడి ఉంది.",
          "రెండు లేదా ఎక్కువ భాగాలు కలిసే బిందువును node అంటారు.",
          "Sign convention: లోపలికి వచ్చే కరెంట్లు +, బయటకు వెళ్లేవి − (లేదా వ్యతిరేకంగా).",
          "ఇది nodal analysis కు ఆధారం.",
        ],
        working: [
          "Node వద్ద అన్ని కరెంట్లను అనుకున్న దిశలతో గుర్తించండి.",
          "Σ I_in = Σ I_out (లేదా signs తో Σ I = 0) రాయండి.",
          "తెలియని కరెంట్ కోసం solve చేయండి.",
          "జవాబు నెగటివ్ వస్తే అసలు దిశ అనుకున్న దానికి వ్యతిరేకం.",
        ],
        example: { q: "ఒక node లోకి I₁ = 5 A, I₂ = 3 A వస్తున్నాయి, I₃ = 6 A బయటకు వెళ్తోంది. I₄ (బయటకు) కనుగొనండి.", steps: ["Σ I_in = Σ I_out", "5 + 3 = 6 + I₄", "I₄ = 2 A (బయటకు)"] },
        advantages: ["ఏ network కైనా పని చేస్తుంది (linear లేదా non-linear)", "Node వద్ద ఎప్పుడూ నిజం", "Nodal analysis కు ఆధారం"],
        disadvantages: ["Lumped circuits కు మాత్రమే (చాలా ఎక్కువ frequency లో కాదు)", "Sign convention జాగ్రత్తగా పాటించాలి", "ఎక్కువ nodes అయితే ఎక్కువ equations"],
        applications: ["Nodal analysis", "Networks లో కరెంట్ పంపిణీ", "లెక్కలను సరిచూసుకోవడం"],
        conclusion: "Node వద్ద charge నిల్వ ఉండదు కాబట్టి లోపలికి వచ్చే కరెంట్ ఎప్పుడూ బయటకు వెళ్లే కరెంట్‌కు సమానం అని KCL చెబుతుంది.",
      },
      mcq: [
        { q: "KCL is based on the conservation of:", options: ["Energy", "Charge", "Momentum", "Power"], answer: 1, explain: "Charge cannot pile up at a node, so current in = current out." },
        { q: "At a node, 4 A and 6 A enter and 3 A leaves. The other leaving current is:", options: ["7 A", "13 A", "1 A", "10 A"], answer: 0, explain: "4 + 6 = 3 + I → I = 7 A." },
        { q: "KCL is applied at:", options: ["A loop", "A node", "A mesh only", "A resistor"], answer: 1, explain: "KCL deals with currents meeting at a node; KVL deals with loops." },
      ],
    },
    {
      id: "kvl", unit: "Circuit Theory", diagrams: ["kvl"],
      title: "Kirchhoff's Voltage Law (KVL)", title_te: "కిర్చాఫ్ వోల్టేజ్ నియమం (KVL)",
      en: {
        definition: "Kirchhoff's Voltage Law states that the algebraic sum of all voltages around any closed loop in a circuit is zero. The sum of the source voltages equals the sum of the voltage drops in the loop.",
        points: [
          "It is based on the law of conservation of energy.",
          "A loop is any closed path in a circuit.",
          "Sign convention: a rise (− to +) is positive and a drop (+ to −) is negative while going around the loop.",
          "It is the basis of mesh (loop) analysis.",
        ],
        working: [
          "Choose a loop and a direction to travel (e.g. clockwise).",
          "Assume a current direction and mark + and − on each resistor (current enters at +).",
          "Add the voltages going around the loop with correct signs and set the sum to zero.",
          "Solve for the unknown current or voltage.",
        ],
        formulas: ["Σ V = 0 around a closed loop", "Σ EMF = Σ IR", "Example loop: V − IR₁ − IR₂ = 0"],
        example: { q: "A 12 V source drives R₁ = 2 Ω and R₂ = 4 Ω in series. Find I, V₁ and V₂ and verify KVL.", steps: ["I = 12 / (2 + 4) = 2 A", "V₁ = 2 × 2 = 4 V,  V₂ = 2 × 4 = 8 V", "KVL: 12 − 4 − 8 = 0 ✓"] },
        advantages: ["Works for any closed loop", "Basis of mesh analysis", "Easy check of calculations"],
        disadvantages: ["Assumes lumped circuits (no changing magnetic flux through the loop)", "Needs careful sign convention", "Many loops give many equations"],
        applications: ["Mesh analysis", "Finding unknown voltages and currents", "Verifying circuit calculations"],
        conclusion: "KVL says energy is conserved around a loop, so the total voltage rise equals the total voltage drop.",
      },
      te: {
        definition: "సర్క్యూట్‌లో ఏదైనా closed loop చుట్టూ ఉన్న అన్ని వోల్టేజ్‌ల బీజీయ మొత్తం సున్నా అని కిర్చాఫ్ వోల్టేజ్ నియమం చెబుతుంది. Loop లోని source వోల్టేజ్‌ల మొత్తం = వోల్టేజ్ drops మొత్తం.",
        points: [
          "ఇది శక్తి పరిరక్షణ నియమం (conservation of energy) పై ఆధారపడి ఉంది.",
          "సర్క్యూట్‌లో ఏదైనా మూసి ఉన్న మార్గాన్ని loop అంటారు.",
          "Sign convention: loop చుట్టూ వెళ్తున్నప్పుడు rise (− నుండి +) పాజిటివ్, drop (+ నుండి −) నెగటివ్.",
          "ఇది mesh (loop) analysis కు ఆధారం.",
        ],
        working: [
          "ఒక loop మరియు వెళ్లే దిశ (ఉదా: clockwise) ఎంచుకోండి.",
          "కరెంట్ దిశను అనుకుని ప్రతి resistor మీద + , − గుర్తించండి (కరెంట్ + వద్ద ప్రవేశిస్తుంది).",
          "Loop చుట్టూ వోల్టేజ్‌లను సరైన signs తో కలిపి మొత్తాన్ని సున్నాకు సమానం చేయండి.",
          "తెలియని కరెంట్ లేదా వోల్టేజ్ కోసం solve చేయండి.",
        ],
        example: { q: "12 V source series లో ఉన్న R₁ = 2 Ω, R₂ = 4 Ω కు కలిపారు. I, V₁, V₂ కనుగొని KVL సరిచూడండి.", steps: ["I = 12 / (2 + 4) = 2 A", "V₁ = 2 × 2 = 4 V,  V₂ = 2 × 4 = 8 V", "KVL: 12 − 4 − 8 = 0 ✓"] },
        advantages: ["ఏ closed loop కైనా పని చేస్తుంది", "Mesh analysis కు ఆధారం", "లెక్కలను సులభంగా సరిచూడవచ్చు"],
        disadvantages: ["Lumped circuits కు మాత్రమే", "Sign convention జాగ్రత్తగా పాటించాలి", "ఎక్కువ loops అయితే ఎక్కువ equations"],
        applications: ["Mesh analysis", "తెలియని వోల్టేజ్‌లు, కరెంట్లు కనుగొనడం", "లెక్కలను సరిచూసుకోవడం"],
        conclusion: "Loop చుట్టూ శక్తి పరిరక్షించబడుతుంది కాబట్టి మొత్తం వోల్టేజ్ rise = మొత్తం వోల్టేజ్ drop అని KVL చెబుతుంది.",
      },
      mcq: [
        { q: "KVL is based on the conservation of:", options: ["Charge", "Energy", "Mass", "Current"], answer: 1, explain: "The net work done moving a charge around a closed loop is zero." },
        { q: "A 10 V source with 2 Ω and 3 Ω in series. Voltage across 3 Ω is:", options: ["4 V", "6 V", "5 V", "10 V"], answer: 1, explain: "I = 10/5 = 2 A; V = 2 × 3 = 6 V." },
        { q: "KVL is applied around:", options: ["A node", "A closed loop", "A single resistor", "An open circuit only"], answer: 1, explain: "KVL sums voltages around a closed path." },
      ],
    },
    {
      id: "thevenin", unit: "Network Theorems", diagrams: ["thevenin"],
      title: "Thevenin's Theorem", title_te: "థెవెనిన్ సిద్ధాంతం",
      en: {
        definition: "Thevenin's theorem states that any linear two-terminal network can be replaced by an equivalent circuit consisting of a single voltage source V_TH in series with a resistance R_TH, connected to the load.",
        points: [
          "V_TH is the open-circuit voltage across the load terminals (load removed).",
          "R_TH is the resistance seen from the load terminals with all independent sources replaced by their internal resistances.",
          "Voltage sources are short-circuited and current sources are open-circuited when finding R_TH.",
          "It applies only to linear, bilateral networks.",
          "It is very useful when the load resistance changes often.",
        ],
        working: [
          "Step 1: Remove the load resistor R_L and mark terminals A and B.",
          "Step 2: Find the open-circuit voltage across A–B. This is V_TH.",
          "Step 3: Replace sources (V → short, I → open) and find the resistance across A–B. This is R_TH.",
          "Step 4: Draw V_TH in series with R_TH and reconnect R_L.",
          "Step 5: Load current I_L = V_TH / (R_TH + R_L).",
        ],
        formulas: ["V_TH = V_oc (open-circuit voltage at A–B)", "R_TH = resistance at A–B with sources replaced", "I_L = V_TH / (R_TH + R_L)", "R_TH = V_TH / I_SC"],
        example: { q: "A 12 V source with R₁ = 6 Ω in series and R₂ = 3 Ω across A–B. Find V_TH, R_TH and I_L for R_L = 2 Ω.", steps: ["V_TH = 12 × 3 / (6 + 3) = 4 V", "R_TH = 6 ∥ 3 = (6 × 3)/(6 + 3) = 2 Ω", "I_L = 4 / (2 + 2) = 1 A"] },
        advantages: ["Simplifies complex networks", "Easy to find current for many different loads", "Useful for maximum power transfer problems"],
        disadvantages: ["Only for linear, bilateral networks", "Power in the equivalent R_TH is not the actual internal power", "Dependent sources need extra steps"],
        applications: ["Load analysis", "Maximum power transfer", "Amplifier and sensor interfacing", "Short-circuit studies"],
        conclusion: "Thevenin's theorem reduces any linear network to V_TH in series with R_TH, making load calculations quick and simple.",
      },
      te: {
        definition: "ఏదైనా linear two-terminal network ను load కు కలిపిన ఒకే voltage source V_TH మరియు దానికి series లో ఉన్న resistance R_TH తో కూడిన సమానమైన సర్క్యూట్‌తో మార్చవచ్చని థెవెనిన్ సిద్ధాంతం చెబుతుంది.",
        points: [
          "V_TH = load తీసివేసినప్పుడు load టెర్మినల్స్ మధ్య open-circuit వోల్టేజ్.",
          "R_TH = అన్ని independent sources ను వాటి internal resistance తో మార్చి load టెర్మినల్స్ నుండి చూసే resistance.",
          "R_TH కనుగొనేటప్పుడు voltage sources ను short, current sources ను open చేయాలి.",
          "ఇది linear, bilateral networks కు మాత్రమే వర్తిస్తుంది.",
          "Load resistance తరచుగా మారేటప్పుడు ఇది చాలా ఉపయోగకరం.",
        ],
        working: [
          "Step 1: Load resistor R_L ను తీసివేసి A, B టెర్మినల్స్ గుర్తించండి.",
          "Step 2: A–B మధ్య open-circuit వోల్టేజ్ కనుగొనండి. అదే V_TH.",
          "Step 3: Sources ను మార్చి (V → short, I → open) A–B మధ్య resistance కనుగొనండి. అదే R_TH.",
          "Step 4: V_TH కు series లో R_TH గీసి R_L ను మళ్లీ కలపండి.",
          "Step 5: Load కరెంట్ I_L = V_TH / (R_TH + R_L).",
        ],
        example: { q: "12 V source కు series లో R₁ = 6 Ω, A–B మధ్య R₂ = 3 Ω ఉన్నాయి. R_L = 2 Ω కు V_TH, R_TH, I_L కనుగొనండి.", steps: ["V_TH = 12 × 3 / (6 + 3) = 4 V", "R_TH = 6 ∥ 3 = (6 × 3)/(6 + 3) = 2 Ω", "I_L = 4 / (2 + 2) = 1 A"] },
        advantages: ["క్లిష్టమైన networks ను సరళం చేస్తుంది", "వేర్వేరు loads కు కరెంట్ సులభంగా కనుగొనవచ్చు", "Maximum power transfer లెక్కలకు ఉపయోగకరం"],
        disadvantages: ["Linear, bilateral networks కు మాత్రమే", "R_TH లో power అసలు internal power కాదు", "Dependent sources ఉంటే అదనపు steps"],
        applications: ["Load analysis", "Maximum power transfer", "Amplifier, sensor interfacing", "Short-circuit studies"],
        conclusion: "థెవెనిన్ సిద్ధాంతం ఏ linear network నైనా V_TH మరియు series R_TH గా తగ్గిస్తుంది, దీంతో load లెక్కలు త్వరగా అవుతాయి.",
      },
      mcq: [
        { q: "While finding R_TH, an ideal voltage source is replaced by:", options: ["An open circuit", "A short circuit", "A 1 Ω resistor", "A current source"], answer: 1, explain: "An ideal voltage source has zero internal resistance, so it is shorted." },
        { q: "V_TH is the:", options: ["Short-circuit current", "Open-circuit voltage at the load terminals", "Source voltage always", "Voltage across R_TH"], answer: 1, explain: "Remove the load and measure the voltage across its terminals." },
        { q: "V_TH = 10 V, R_TH = 3 Ω, R_L = 2 Ω. Load current is:", options: ["2 A", "5 A", "3.33 A", "1 A"], answer: 0, explain: "I_L = V_TH/(R_TH + R_L) = 10/5 = 2 A." },
      ],
    },
    {
      id: "norton", unit: "Network Theorems", diagrams: ["norton"],
      title: "Norton's Theorem", title_te: "నార్టన్ సిద్ధాంతం",
      en: {
        definition: "Norton's theorem states that any linear two-terminal network can be replaced by an equivalent circuit consisting of a current source I_N in parallel with a resistance R_N, connected to the load.",
        points: [
          "I_N is the short-circuit current through the load terminals (load replaced by a short).",
          "R_N is found the same way as R_TH, so R_N = R_TH.",
          "Norton and Thevenin equivalents are interchangeable: V_TH = I_N × R_N.",
          "It applies only to linear, bilateral networks.",
        ],
        working: [
          "Step 1: Remove R_L and short-circuit terminals A–B.",
          "Step 2: Find the current through the short. This is I_N (= I_SC).",
          "Step 3: Replace sources (V → short, I → open) and find R_N across A–B.",
          "Step 4: Draw I_N in parallel with R_N and reconnect R_L.",
          "Step 5: Load current by current division: I_L = I_N × R_N / (R_N + R_L).",
        ],
        formulas: ["I_N = I_SC (short-circuit current at A–B)", "R_N = R_TH", "I_L = I_N × R_N / (R_N + R_L)", "V_TH = I_N × R_N"],
        example: { q: "Same network: 12 V source, R₁ = 6 Ω, R₂ = 3 Ω across A–B, R_L = 2 Ω. Find I_N, R_N and I_L.", steps: ["Short A–B: R₂ is shorted, so I_N = 12 / 6 = 2 A", "R_N = 6 ∥ 3 = 2 Ω", "I_L = 2 × 2 / (2 + 2) = 1 A (same as Thevenin ✓)"] },
        advantages: ["Convenient for parallel loads", "Easy conversion to and from Thevenin", "Simplifies nodal analysis"],
        disadvantages: ["Only for linear, bilateral networks", "Internal power of the equivalent is not the real power", "Dependent sources need extra steps"],
        applications: ["Circuits with parallel loads", "Transistor and op-amp models", "Source transformation"],
        conclusion: "Norton's theorem replaces a linear network with I_N in parallel with R_N; it is the current-source dual of Thevenin's theorem.",
      },
      te: {
        definition: "ఏదైనా linear two-terminal network ను load కు కలిపిన ఒక current source I_N మరియు దానికి parallel లో ఉన్న resistance R_N తో కూడిన సమానమైన సర్క్యూట్‌తో మార్చవచ్చని నార్టన్ సిద్ధాంతం చెబుతుంది.",
        points: [
          "I_N = load టెర్మినల్స్‌ను short చేసినప్పుడు వాటి ద్వారా వెళ్లే short-circuit కరెంట్.",
          "R_N ను R_TH లాగే కనుగొంటాం, కాబట్టి R_N = R_TH.",
          "Norton, Thevenin equivalents ఒకదానికొకటి మార్చుకోవచ్చు: V_TH = I_N × R_N.",
          "ఇది linear, bilateral networks కు మాత్రమే వర్తిస్తుంది.",
        ],
        working: [
          "Step 1: R_L తీసివేసి A–B టెర్మినల్స్‌ను short చేయండి.",
          "Step 2: Short ద్వారా కరెంట్ కనుగొనండి. అదే I_N (= I_SC).",
          "Step 3: Sources ను మార్చి (V → short, I → open) A–B మధ్య R_N కనుగొనండి.",
          "Step 4: I_N కు parallel లో R_N గీసి R_L ను మళ్లీ కలపండి.",
          "Step 5: Current division ద్వారా I_L = I_N × R_N / (R_N + R_L).",
        ],
        example: { q: "అదే network: 12 V source, R₁ = 6 Ω, A–B మధ్య R₂ = 3 Ω, R_L = 2 Ω. I_N, R_N, I_L కనుగొనండి.", steps: ["A–B short: R₂ short అవుతుంది, కాబట్టి I_N = 12 / 6 = 2 A", "R_N = 6 ∥ 3 = 2 Ω", "I_L = 2 × 2 / (2 + 2) = 1 A (Thevenin తో సమానం ✓)"] },
        advantages: ["Parallel loads కు అనుకూలం", "Thevenin కు సులభంగా మార్చవచ్చు", "Nodal analysis ను సరళం చేస్తుంది"],
        disadvantages: ["Linear, bilateral networks కు మాత్రమే", "Equivalent లో power అసలు power కాదు", "Dependent sources ఉంటే అదనపు steps"],
        applications: ["Parallel loads ఉన్న circuits", "Transistor, op-amp models", "Source transformation"],
        conclusion: "నార్టన్ సిద్ధాంతం linear network ను I_N మరియు parallel R_N గా మారుస్తుంది; ఇది థెవెనిన్ సిద్ధాంతానికి current-source రూపం.",
      },
      mcq: [
        { q: "Norton's current I_N is the:", options: ["Open-circuit current", "Short-circuit current at the load terminals", "Load current", "Source current always"], answer: 1, explain: "Short the load terminals and measure the current through the short." },
        { q: "The relation between Norton and Thevenin resistance is:", options: ["R_N = 2R_TH", "R_N = R_TH", "R_N = 1/R_TH", "No relation"], answer: 1, explain: "Both are the resistance seen from the terminals with sources replaced." },
        { q: "I_N = 3 A and R_N = 4 Ω. The Thevenin voltage is:", options: ["12 V", "0.75 V", "7 V", "1.33 V"], answer: 0, explain: "V_TH = I_N × R_N = 3 × 4 = 12 V." },
      ],
    },
    {
      id: "superposition", unit: "Network Theorems", diagrams: ["superposition"],
      title: "Superposition Theorem", title_te: "సూపర్‌పొజిషన్ సిద్ధాంతం",
      en: {
        definition: "The superposition theorem states that in a linear network with two or more independent sources, the current or voltage in any element equals the algebraic sum of the currents or voltages produced by each source acting alone, with the other sources replaced by their internal resistances.",
        points: [
          "Consider one independent source at a time.",
          "Replace the other voltage sources by short circuits and current sources by open circuits.",
          "Add the individual responses algebraically (with signs).",
          "Valid only for linear networks; it cannot be used directly to find power.",
        ],
        working: [
          "Step 1: Keep only source V₁; short V₂. Find the required voltage or current.",
          "Step 2: Keep only source V₂; short V₁. Find the same quantity.",
          "Step 3: Add the two results algebraically for the total response.",
          "Step 4: Find power only after getting the total current (P = I²R).",
        ],
        formulas: ["Response = Σ (response due to each source alone)", "I_total = I′ + I″", "Power is NOT superposable: P ≠ P′ + P″"],
        example: { q: "V₁ = 10 V with R₁ = 5 Ω and V₂ = 5 V with R₂ = 5 Ω feed node A; R₃ = 10 Ω from A to ground. Find V_A and I₃.", steps: ["V₁ alone: R₂ ∥ R₃ = 3.33 Ω, V_A′ = 10 × 3.33 / (5 + 3.33) = 4 V", "V₂ alone: R₁ ∥ R₃ = 3.33 Ω, V_A″ = 5 × 3.33 / (5 + 3.33) = 2 V", "V_A = 4 + 2 = 6 V, I₃ = 6 / 10 = 0.6 A"] },
        advantages: ["Breaks a multi-source problem into simple single-source problems", "No simultaneous equations needed", "Shows the effect of each source"],
        disadvantages: ["Only for linear networks", "Cannot find power directly", "Long for circuits with many sources"],
        applications: ["Circuits with multiple sources", "AC + DC analysis (bias + signal) in amplifiers", "Signal analysis"],
        conclusion: "Superposition lets us analyse a linear multi-source circuit one source at a time and add the results.",
      },
      te: {
        definition: "రెండు లేదా ఎక్కువ independent sources ఉన్న linear network లో ఏదైనా భాగంలో కరెంట్ లేదా వోల్టేజ్ = ప్రతి source ఒంటరిగా పని చేసినప్పుడు (మిగతా sources ను internal resistance తో మార్చి) వచ్చే కరెంట్లు లేదా వోల్టేజ్‌ల బీజీయ మొత్తం. ఇదే సూపర్‌పొజిషన్ సిద్ధాంతం.",
        points: [
          "ఒక్కసారికి ఒక independent source మాత్రమే తీసుకోవాలి.",
          "మిగతా voltage sources ను short, current sources ను open చేయాలి.",
          "వచ్చిన ఫలితాలను signs తో కలపాలి.",
          "Linear networks కు మాత్రమే; power ను నేరుగా కనుగొనడానికి వాడలేం.",
        ],
        working: [
          "Step 1: V₁ మాత్రమే ఉంచి V₂ ని short చేయండి. కావలసిన వోల్టేజ్/కరెంట్ కనుగొనండి.",
          "Step 2: V₂ మాత్రమే ఉంచి V₁ ని short చేయండి. అదే కనుగొనండి.",
          "Step 3: రెండు ఫలితాలను బీజీయంగా కలిపితే మొత్తం response వస్తుంది.",
          "Step 4: మొత్తం కరెంట్ వచ్చిన తర్వాతే power కనుగొనండి (P = I²R).",
        ],
        example: { q: "V₁ = 10 V (R₁ = 5 Ω), V₂ = 5 V (R₂ = 5 Ω) node A కు కలిపారు; A నుండి ground కు R₃ = 10 Ω. V_A, I₃ కనుగొనండి.", steps: ["V₁ మాత్రమే: R₂ ∥ R₃ = 3.33 Ω, V_A′ = 10 × 3.33 / (5 + 3.33) = 4 V", "V₂ మాత్రమే: R₁ ∥ R₃ = 3.33 Ω, V_A″ = 5 × 3.33 / (5 + 3.33) = 2 V", "V_A = 4 + 2 = 6 V, I₃ = 6 / 10 = 0.6 A"] },
        advantages: ["ఎక్కువ sources ఉన్న సమస్యను సరళమైన single-source సమస్యలుగా విడదీస్తుంది", "Simultaneous equations అవసరం లేదు", "ప్రతి source ప్రభావం తెలుస్తుంది"],
        disadvantages: ["Linear networks కు మాత్రమే", "Power ను నేరుగా కనుగొనలేం", "ఎక్కువ sources ఉంటే పొడవుగా ఉంటుంది"],
        applications: ["ఎక్కువ sources ఉన్న circuits", "Amplifiers లో AC + DC analysis", "Signal analysis"],
        conclusion: "సూపర్‌పొజిషన్ ద్వారా linear multi-source సర్క్యూట్‌ను ఒక్కో source తో విశ్లేషించి ఫలితాలను కలపవచ్చు.",
      },
      mcq: [
        { q: "In superposition, an unused ideal current source is replaced by:", options: ["Short circuit", "Open circuit", "Its value doubled", "A voltage source"], answer: 1, explain: "An ideal current source has infinite internal resistance, so it is opened." },
        { q: "Superposition cannot be used directly to find:", options: ["Current", "Voltage", "Power", "Any quantity"], answer: 2, explain: "Power depends on I², which is not linear, so it is not superposable." },
        { q: "Superposition theorem is valid for:", options: ["Non-linear circuits", "Linear circuits", "Only DC circuits", "Only AC circuits"], answer: 1, explain: "It relies on linearity (proportionality and additivity)." },
      ],
    },
    {
      id: "maxpower", unit: "Network Theorems", diagrams: ["maxpower"],
      title: "Maximum Power Transfer Theorem", title_te: "గరిష్ట శక్తి బదిలీ సిద్ధాంతం",
      en: {
        definition: "The maximum power transfer theorem states that a DC source delivers maximum power to a load when the load resistance equals the Thevenin (internal) resistance of the source network: R_L = R_TH.",
        points: [
          "First reduce the network to its Thevenin equivalent (V_TH, R_TH).",
          "Maximum power occurs at R_L = R_TH.",
          "At maximum power the efficiency is only 50 %.",
          "Used where getting maximum power matters more than efficiency (e.g. communication circuits).",
        ],
        working: [
          "Load current I = V_TH / (R_TH + R_L), load power P = I² R_L.",
          "So P = V_TH² R_L / (R_TH + R_L)².",
          "Setting dP/dR_L = 0 gives R_L = R_TH.",
          "Substituting gives P_max = V_TH² / (4 R_TH).",
          "Half of the power is lost in R_TH, so efficiency = 50 %.",
        ],
        formulas: ["Condition: R_L = R_TH", "P = V_TH² R_L / (R_TH + R_L)²", "P_max = V_TH² / (4 R_TH)", "Efficiency at P_max = 50 %"],
        example: { q: "V_TH = 4 V and R_TH = 2 Ω. Find R_L for maximum power and P_max.", steps: ["R_L = R_TH = 2 Ω", "P_max = V_TH² / (4 R_TH) = 16 / 8", "P_max = 2 W"] },
        advantages: ["Gives the best load value for maximum power", "Easy to apply with Thevenin's theorem", "Useful in impedance matching"],
        disadvantages: ["Efficiency is only 50 % at maximum power", "Not used in power systems (efficiency matters more)", "Only for linear networks"],
        applications: ["Audio amplifier to speaker matching", "Antenna and communication systems", "Solar panel MPPT concept", "Impedance matching"],
        conclusion: "Maximum power is transferred when R_L = R_TH, giving P_max = V_TH²/4R_TH at 50 % efficiency.",
      },
      te: {
        definition: "Load resistance source network యొక్క Thevenin (internal) resistance కు సమానమైనప్పుడు (R_L = R_TH) DC source load కు గరిష్ట శక్తిని ఇస్తుందని గరిష్ట శక్తి బదిలీ సిద్ధాంతం చెబుతుంది.",
        points: [
          "ముందుగా network ను Thevenin equivalent (V_TH, R_TH) గా తగ్గించాలి.",
          "R_L = R_TH అయినప్పుడు గరిష్ట శక్తి వస్తుంది.",
          "గరిష్ట శక్తి వద్ద efficiency 50 % మాత్రమే.",
          "Efficiency కంటే గరిష్ట శక్తి ముఖ్యమైన చోట (ఉదా: communication circuits) వాడతారు.",
        ],
        working: [
          "Load కరెంట్ I = V_TH / (R_TH + R_L), load power P = I² R_L.",
          "కాబట్టి P = V_TH² R_L / (R_TH + R_L)².",
          "dP/dR_L = 0 చేస్తే R_L = R_TH వస్తుంది.",
          "ప్రతిక్షేపిస్తే P_max = V_TH² / (4 R_TH).",
          "సగం శక్తి R_TH లో పోతుంది, కాబట్టి efficiency = 50 %.",
        ],
        example: { q: "V_TH = 4 V, R_TH = 2 Ω. గరిష్ట శక్తి కోసం R_L మరియు P_max కనుగొనండి.", steps: ["R_L = R_TH = 2 Ω", "P_max = V_TH² / (4 R_TH) = 16 / 8", "P_max = 2 W"] },
        advantages: ["గరిష్ట శక్తి కోసం సరైన load విలువ ఇస్తుంది", "Thevenin తో సులభంగా వాడవచ్చు", "Impedance matching లో ఉపయోగకరం"],
        disadvantages: ["గరిష్ట శక్తి వద్ద efficiency 50 % మాత్రమే", "Power systems లో వాడరు (efficiency ముఖ్యం)", "Linear networks కు మాత్రమే"],
        applications: ["Audio amplifier – speaker matching", "Antenna, communication systems", "Solar panel MPPT భావన", "Impedance matching"],
        conclusion: "R_L = R_TH అయినప్పుడు గరిష్ట శక్తి బదిలీ అవుతుంది; P_max = V_TH²/4R_TH, efficiency 50 %.",
      },
      mcq: [
        { q: "Maximum power is transferred to the load when:", options: ["R_L = 0", "R_L = R_TH", "R_L = 2R_TH", "R_L is infinite"], answer: 1, explain: "Setting dP/dR_L = 0 gives R_L = R_TH." },
        { q: "Efficiency at maximum power transfer is:", options: ["100 %", "75 %", "50 %", "25 %"], answer: 2, explain: "Equal power is dissipated in R_TH and R_L, so efficiency = 50 %." },
        { q: "V_TH = 10 V, R_TH = 5 Ω. P_max is:", options: ["5 W", "10 W", "20 W", "2.5 W"], answer: 0, explain: "P_max = V²/(4R) = 100/20 = 5 W." },
      ],
    },
  ];

  /** Build a marks-wise answer from verified parts. lang: "en" | "te". */
  function answer(topic, marks = 5, lang = "en") {
    const L = topic[lang] || topic.en;
    const E = topic.en;
    const out = { title: lang === "te" ? topic.title_te : topic.title, marks, blocks: [] };
    const b = (type, heading, data) => out.blocks.push({ type, heading, data });
    const H = lang === "te"
      ? { def: "నిర్వచనం", points: "ముఖ్యాంశాలు", work: "పని విధానం", form: "సూత్రాలు", diag: "సర్క్యూట్ డయాగ్రామ్", ex: "ఉదాహరణ", adv: "ప్రయోజనాలు", dis: "లోపాలు", app: "అనువర్తనాలు", con: "ముగింపు" }
      : { def: "Definition", points: "Important points", work: "Working", form: "Formulas", diag: "Circuit diagram", ex: "Example", adv: "Advantages", dis: "Disadvantages", app: "Applications", con: "Conclusion" };
    b("p", H.def, L.definition);
    if (marks === 2) { if (E.formulas[0]) b("formula", H.form, [E.formulas[0]]); return out; }
    b("list", H.points, marks >= 8 ? L.points : L.points.slice(0, 4));
    if (marks >= 8) b("steps", H.work, L.working);
    b("formula", H.form, marks >= 8 ? E.formulas : E.formulas.slice(0, 3));
    if (marks >= 8) b("example", H.ex, L.example);
    if (marks >= 10) {
      b("list", H.adv, L.advantages);
      b("list", H.dis, L.disadvantages);
      b("list", H.app, L.applications);
      b("p", H.con, L.conclusion);
    }
    return out;
  }

  /** Answer as markdown-ish text for the handwriting converter (keeps everything). */
  function answerText(a) {
    const out = [`# ${a.title} (${a.marks} marks)`];
    for (const bl of a.blocks) {
      out.push(`## ${bl.heading}`);
      if (bl.type === "p") out.push(bl.data);
      else if (bl.type === "list") bl.data.forEach((x) => out.push(`- ${x}`));
      else if (bl.type === "steps") bl.data.forEach((x, i) => out.push(`${i + 1}. ${x}`));
      else if (bl.type === "formula") bl.data.forEach((x) => out.push(`= ${x}`));
      else if (bl.type === "diagram") bl.data.forEach((id) => out.push(`[[diagram:${id}]]`));
      else if (bl.type === "example") { out.push(`Q: ${bl.data.q}`); bl.data.steps.forEach((x) => out.push(`= ${x}`)); }
      out.push("");
    }
    return out.join("\n");
  }

  /** Find a library topic that matches free text (question, title). */
  function match(text) {
    const t = String(text || "").toLowerCase();
    const keys = {
      pn_diode: ["pn junction", "p-n junction", "junction diode", "forward bias", "reverse bias", "depletion"],
      zener: ["zener"],
      hwr: ["half wave", "half-wave"],
      fwr_ct: ["centre tap", "center tap", "centre-tap", "center-tap", "full wave rectifier", "full-wave rectifier"],
      bridge: ["bridge rectifier"],
      npn: ["npn"],
      pnp: ["pnp"],
      vdiv: ["voltage divider", "voltage division"],
      idiv: ["current divider", "current division"],
      kcl: ["kcl", "kirchhoff's current", "kirchhoffs current", "kirchhoff current"],
      kvl: ["kvl", "kirchhoff's voltage", "kirchhoffs voltage", "kirchhoff voltage"],
      thevenin: ["thevenin", "thévenin"],
      norton: ["norton"],
      superposition: ["superposition"],
      maxpower: ["maximum power", "max power"],
    };
    // most specific first (bridge before full wave)
    const order = ["bridge", "zener", "npn", "pnp", "hwr", "fwr_ct", "pn_diode", "vdiv", "idiv", "kcl", "kvl", "thevenin", "norton", "superposition", "maxpower"];
    for (const id of order) if (keys[id].some((k) => t.includes(k))) return T.find((x) => x.id === id);
    return null;
  }

  /** Turn V_Z, R_{TH}, I_Z(min) into HTML subscripts (input must already be HTML-escaped). */
  const sub = (html) => String(html).replace(/([A-Za-zΩπ0-9)\]])_\{([^}]+)\}|([A-Za-z)\]])_([A-Za-z0-9]+(?:\([a-z]+\))?)/g, (m, a, b, c, d) => `${a || c}<sub>${b || d}</sub>`);

  root.NotesLibrary = { topics: T, answer, answerText, match, sub, get: (id) => T.find((x) => x.id === id) };
})(window);
