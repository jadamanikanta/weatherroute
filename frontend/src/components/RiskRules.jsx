import React from "react";
import "./RiskRules.css"; 

const RiskRules = () => {
    return (
        <section className="risk-rules-section">
            <div className="risk-rules-container">

                

                <div className="risk-rules-card">
                    <h3>Weather Risk Conditions</h3>

                    <div className="risk-table-wrapper">
                        <table className="risk-rules-table">
                            <thead>
                                <tr>
                                    <th>Condition</th>
                                    <th>Low</th>
                                    <th>Moderate</th>
                                    <th>High</th>
                                    <th>Severe</th>
                                    <th>No Travel</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>Wind</td>
                                    <td>&lt;25 mph</td>
                                    <td>25–34</td>
                                    <td>35–44</td>
                                    <td>45–54</td>
                                    <td>≥55 mph</td>
                                </tr>
                                <tr>
                                    <td>Rain</td>
                                    <td>&lt;0.10 in</td>
                                    <td>0.10–0.25</td>
                                    <td>0.25–0.50</td>
                                    <td>0.50–1.00</td>
                                    <td>&gt;1.00</td>
                                </tr>
                                <tr>
                                    <td>Snow</td>
                                    <td>&lt;0.5 in</td>
                                    <td>0.5–1.0</td>
                                    <td>1.0–2.0</td>
                                    <td>2.0–3.0</td>
                                    <td>&gt;3.0</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>


            </div>
        </section>
    );
};

export default RiskRules;
