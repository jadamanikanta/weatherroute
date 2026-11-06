
import { useState } from "react";

function RouteForm({ onSubmit, loading }) {

    const [form, setForm] = useState({
        origin: "",
        destination: "",
        departure_time: "",
        load_weight: "",
        interval: "25"
    });

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm({
            ...form,
            [name]: value
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (Number(form.load_weight) < 0) {
            return;
        }

        onSubmit({
            ...form,
            load_weight: Number(form.load_weight),
            interval: Number(form.interval),
            departure_time: new Date(
                form.departure_time
            ).toISOString()
        });
    };

    return (
        <form className="route-form" onSubmit={handleSubmit}>

            <div className="form-grid">

                <div className="form-group">
                    <label>Origin</label>

                    <input
                        type="text"
                        name="origin"
                        placeholder="Enter starting location"
                        value={form.origin}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Destination</label>

                    <input
                        type="text"
                        name="destination"
                        placeholder="Enter destination"
                        value={form.destination}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Departure date and time</label>

                    <input
                        type="datetime-local"
                        name="departure_time"
                        value={form.departure_time}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Load weight (lb)</label>

                    <input
                        type="number"
                        name="load_weight"
                        placeholder="Enter truck load"
                        min="0"
                        step="any"
                        value={form.load_weight}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Checkpoint interval</label>

                    <select
                        name="interval"
                        value={form.interval}
                        onChange={handleChange}
                    >
                        <option value="10">Every 10 miles</option>
                        <option value="25">Every 25 miles</option>
                        <option value="50">Every 50 miles</option>
                    </select>
                </div>

            </div>

            <button
                type="submit"
                className="analyze-button"
                disabled={loading}
            >
                {loading ? "Analyzing routes..." : "Analyze Routes"}
            </button>

        </form>
    );
}

export default RouteForm;
