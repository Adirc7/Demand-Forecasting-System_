import { useState, useEffect } from "react";

function AnimatedBar({ item, index, visible, maxVal }) {
    const pct = Math.abs(item.value) / maxVal;
    const widthPct = Math.min(100, pct * 100); // cap at 100%

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-20px)",
                transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 120 + 300}ms`,
            }}
        >
            <div
                style={{
                    width: "140px",
                    textAlign: "right",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "11px",
                    color: "#64748b",
                    letterSpacing: "0.03em",
                    flexShrink: 0,
                }}
            >
                {item.label}
            </div>

            <div style={{ flex: 1, position: "relative", height: "28px", display: "flex", alignItems: "center" }}>
                {/* Center line */}
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        background: "rgba(15,23,42,0.048)",
                    }}
                />

                {/* Bar */}
                <div
                    style={{
                        position: "absolute",
                        width: `${widthPct / 2}%`,
                        height: "18px",
                        background: item.positive
                            ? `linear-gradient(90deg, ${item.color}44, ${item.color})`
                            : `linear-gradient(270deg, ${item.color}44, ${item.color})`,
                        borderRadius: item.positive ? "0 4px 4px 0" : "4px 0 0 4px",
                        left: item.positive ? "50%" : `calc(50% - ${widthPct / 2}%)`,
                        boxShadow: `0 0 12px ${item.color}66`,
                        transition: `width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 120 + 400}ms`,
                    }}
                />

                {/* Glow dot at tip */}
                <div
                    style={{
                        position: "absolute",
                        left: item.positive ? `calc(50% + ${widthPct / 2}%)` : `calc(50% - ${widthPct / 2}%)`,
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: item.color,
                        boxShadow: `0 0 8px ${item.color}`,
                        transform: "translate(-50%, 0)",
                        top: "50%",
                        marginTop: "-3px",
                    }}
                />
            </div>

            <div
                style={{
                    width: "42px",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "11px",
                    color: item.positive ? "#0891b2" : "#d60033",
                    flexShrink: 0,
                }}
            >
                {item.positive ? "+" : ""}{item.value.toFixed(2)}
            </div>
        </div>
    );
}

function PulsingRing({ delay = 0 }) {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                animation: `ping 2s ${delay}s ease-out infinite`,
            }}
        />
    );
}

export default function WhyPopup({ alert, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);



    if (!alert) return null;

    // Map AI backend data or use simulated fallback if missing
    const rawShap = alert?.shap_factors?.length > 0 
        ? alert.shap_factors 
        : [
            { feature: "Recent Sales (Simulated)", impact: 1.2 },
            { feature: "Seasonality (Simulated)", impact: -0.38 },
            { feature: "Category Base", impact: 0.65 },
            { feature: "Lead Time Buffer", impact: 0.42 }
        ];

    const shapData = rawShap.map(item => ({
        label: item.feature,
        value: item.impact,
        color: item.impact >= 0 ? "#0891b2" : "#d60033",
        positive: item.impact >= 0
    }));

    // Dynamically calculate the maximum boundary so large AI inputs don't break the UI
    const maxVal = Math.max(...shapData.map(d => Math.abs(d.value)), 1.4);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.45)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', system-ui, sans-serif",
                padding: "24px",
                zIndex: 9999
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Outfit:wght@400;600;700;900&display=swap');

        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glitch {
          0%, 90%, 100% { clip-path: none; transform: none; }
          91% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 0); }
          93% { clip-path: inset(60% 0 20% 0); transform: translate(2px, 0); }
          95% { clip-path: none; transform: none; }
        }
        @keyframes borderRotate {
          from { --angle: 0deg; }
          to { --angle: 360deg; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes textFlicker {
          0%, 98%, 100% { opacity: 1; }
          99% { opacity: 0.4; }
        }
        @keyframes scanMove {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>

            <div
                style={{
                    width: "520px",
                    background: "linear-gradient(145deg, #ffffff 0%, #ffffff 100%)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    position: "relative",
                    animation: "fadeSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                    boxShadow: "0 0 0 1px rgba(0,229,255,0.052), 0 0 60px rgba(0,229,255,0.028), 0 40px 80px rgba(15,23,42,0.09)",
                }}
            >


                {/* Top corner decorations */}
                <div style={{ position: "absolute", top: 0, left: 0, width: "40px", height: "40px" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: "40px", height: "1px", background: "linear-gradient(90deg, #00e5ff, transparent)" }} />
                    <div style={{ position: "absolute", top: 0, left: 0, width: "1px", height: "40px", background: "linear-gradient(180deg, #00e5ff, transparent)" }} />
                </div>
                <div style={{ position: "absolute", top: 0, right: 0, width: "40px", height: "40px" }}>
                    <div style={{ position: "absolute", top: 0, right: 0, width: "40px", height: "1px", background: "linear-gradient(270deg, #00e5ff, transparent)" }} />
                    <div style={{ position: "absolute", top: 0, right: 0, width: "1px", height: "40px", background: "linear-gradient(180deg, #00e5ff, transparent)" }} />
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "40px", height: "40px" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, width: "40px", height: "1px", background: "linear-gradient(90deg, #00e5ff, transparent)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, width: "1px", height: "40px", background: "linear-gradient(0deg, #00e5ff, transparent)" }} />
                </div>
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "40px", height: "40px" }}>
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: "40px", height: "1px", background: "linear-gradient(270deg, #00e5ff, transparent)" }} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: "1px", height: "40px", background: "linear-gradient(0deg, #00e5ff, transparent)" }} />
                </div>

                {/* Header */}
                <div style={{ padding: "28px 28px 20px", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                {/* Status indicator */}
                                <div style={{ position: "relative", width: "10px", height: "10px" }}>
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: alert.urgency === 'OK' ? "#22c55e" : "#ff3d6b", animation: "statusBlink 1.5s ease-in-out infinite" }} />
                                    <PulsingRing delay={0} />
                                    <PulsingRing delay={0.7} />
                                </div>
                                <span style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: '12px',
                                    color: alert.urgency === 'OK' ? "#16a34a" : "#d60033",
                                    letterSpacing: "0.2em",
                                    fontWeight: 600,
                                }}>
                                    {alert.urgency === 'OK' ? "NOMINAL STOCK" : "REORDER TRIGGERED"}
                                </span>
                            </div>

                            <h1
                                style={{
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontSize: "24px",
                                    fontWeight: 900,
                                    color: "#0f172a",
                                    margin: 0,
                                    lineHeight: 1.1,
                                    animation: "glitch 8s ease-in-out infinite",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {alert.urgency === 'OK' ? "STATUS" : "REORDER"}
                                <br />
                                <span style={{ color: "#0891b2" }}>EXPLANATION</span>
                            </h1>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                background: "transparent",
                                border: "1px solid rgba(15,23,42,0.132)",
                                color: "#445566",
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                transition: "all 0.2s",
                                flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                                e.target.style.borderColor = "#d60033";
                                e.target.style.color = "#d60033";
                            }}
                            onMouseLeave={e => {
                                e.target.style.borderColor = "rgba(15,23,42,0.132)";
                                e.target.style.color = "#445566";
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Product tag */}
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "12px",
                            padding: "5px 10px",
                            background: "rgba(0, 229, 255, 0.05)",
                            border: "1px solid rgba(0, 229, 255, 0.15)",
                            borderRadius: "4px",
                        }}
                    >
                        <span style={{ fontSize: '12px', color: "#0891b2", opacity: 0.6, letterSpacing: "0.1em" }}>{alert.sku}</span>
                        <div style={{ width: "1px", height: "10px", background: "rgba(0,229,255,0.2)" }} />
                        <span style={{ fontSize: '12px', color: "#64748b", letterSpacing: "0.05em" }}>{alert.product_name}</span>
                    </div>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2), transparent)", margin: "0 28px" }} />

                {/* AI Analysis block */}
                <div style={{ padding: "20px 28px" }}>
                    <div
                        style={{
                            background: "linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(255,61,107,0.04) 100%)",
                            border: "1px solid rgba(0, 229, 255, 0.12)",
                            borderRadius: "10px",
                            padding: "16px 18px",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Shimmer line */}
                        <div style={{
                            position: "absolute",
                            top: 0, left: "-100%", right: "200%", height: "1px",
                            background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)",
                            animation: "shimmer 3s ease-in-out infinite",
                        }} />

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                            <div style={{ fontSize: "14px", animation: "float 3s ease-in-out infinite" }}>✦</div>
                            <span style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: '12px',
                                color: "#0891b2",
                                letterSpacing: "0.18em",
                                fontWeight: 700,
                            }}>
                                GEMINI AI ANALYSIS
                            </span>
                            <div style={{
                                marginLeft: "auto",
                                fontSize: '11px',
                                color: "#445566",
                                fontFamily: "'Inter', system-ui, sans-serif",
                                animation: "textFlicker 6s ease-in-out infinite",
                            }}>
                                v2.5-FLASH · {alert.confidence ? alert.confidence.split(' ')[0] : 'CONFIDENTIAL'} conf
                            </div>
                        </div>

                        <p style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "#3f6b97",
                            lineHeight: 1.7,
                            fontFamily: "'Inter', system-ui, sans-serif",
                        }}>
                            {alert.explanation || "Stock level has fallen below the safety reorder point. Immediate procurement action recommended to prevent stockout risk."}
                        </p>
                    </div>
                </div>

                {/* SHAP chart */}
                <div style={{ padding: "0 28px 24px" }}>
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
                            <span style={{
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontSize: "11px",
                                color: "#0f172a",
                                letterSpacing: "0.12em",
                                fontWeight: 700,
                            }}>
                                FEATURE IMPORTANCE
                            </span>
                            <span style={{
                                fontSize: '11px',
                                color: "#445566",
                                letterSpacing: "0.1em",
                                background: "rgba(15,23,42,0.024)",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                border: "1px solid rgba(15,23,42,0.066)",
                            }}>
                                SHAP
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: "#445566", letterSpacing: "0.04em" }}>
                            Forces driving model prediction{" "}
                            <span style={{ color: "#0891b2" }}>▲ up</span>{" "}
                            or{" "}
                            <span style={{ color: "#d60033" }}>▼ down</span>
                        </p>
                    </div>

                    <div
                        style={{
                            background: "rgba(15,23,42,0.03)",
                            border: "1px solid rgba(15,23,42,0.055)",
                            borderRadius: "10px",
                            padding: "20px 16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }}
                    >
                        {shapData.map((item, i) => (
                            <AnimatedBar key={item.label} item={item} index={i} visible={visible} maxVal={maxVal} />
                        ))}

                        {/* X axis */}
                        <div style={{ marginTop: "4px", paddingLeft: "152px" }}>
                            <div style={{ height: "1px", background: "rgba(15,23,42,0.036)", position: "relative", marginBottom: "6px" }}>
                                {[-maxVal, -maxVal/2, 0, maxVal/2, maxVal].map(tick => (
                                    <div
                                        key={tick}
                                        style={{
                                            position: "absolute",
                                            left: `${((tick + maxVal) / (maxVal * 2)) * 100}%`,
                                            transform: "translateX(-50%)",
                                            width: "1px",
                                            height: "4px",
                                            background: "rgba(15,23,42,0.06)",
                                            top: 0,
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                {[-maxVal, -maxVal/2, 0, maxVal/2, maxVal].map(tick => (
                                    <span
                                        key={tick}
                                        style={{
                                            fontSize: '11px',
                                            color: "#334455",
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                        }}
                                    >
                                        {Number.isInteger(tick) ? tick : tick.toFixed(1)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "16px 28px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid rgba(15,23,42,0.044)",
                    }}
                >
                    <div style={{ fontSize: '11px', color: "#223344", letterSpacing: "0.08em", fontFamily: "'Inter', system-ui, sans-serif" }}>
                        GEN: {new Date().toISOString().replace('T', ' ').split('.')[0]} UTC
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: "linear-gradient(135deg, #00c8e0, #0088cc)",
                            border: "none",
                            color: "#000",
                            padding: "10px 24px",
                            borderRadius: "6px",
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s",
                            boxShadow: "0 0 20px rgba(0,229,255,0.087)",
                        }}
                        onMouseEnter={e => {
                            e.target.style.boxShadow = "0 0 30px rgba(0, 229, 255, 0.5)";
                            e.target.style.transform = "scale(1.03)";
                        }}
                        onMouseLeave={e => {
                            e.target.style.boxShadow = "0 0 20px rgba(0, 229, 255, 0.25)";
                            e.target.style.transform = "scale(1)";
                        }}
                    >
                        CLOSE PANEL
                    </button>
                </div>
            </div>
        </div>
    );
}
