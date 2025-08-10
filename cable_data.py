from math import pi
import csv
from flask import Flask, jsonify, render_template

app = Flask(__name__)

def load_cable_db(filepath='cable_db.csv'):
    cables = []
    try:
        with open(filepath, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Convert numeric fields first so we can use them in name
                cores = int(row.get('cores', 3))
                brand = str(row.get('brand',2))
                cable_type = str(row.get('cable_type',0))
                conductor_size = float(row.get('conductor_size_mm2', 4))
                weight_per_meter = float(row.get('weight_per_meter_kg', 10))

                # Format name
                row['name'] = f"{brand} {cores}C {int(conductor_size)}mm²"  # int() to avoid decimals in mm²

                # Store back numeric values as well
                row['cores'] = cores
                row['cable_type'] = cable_type
                row['conductor_size_mm2'] = conductor_size
                row['overall_diameter_mm'] = float(row.get('overall_diameter_mm', 9))
                row['weight_per_meter_kg'] = weight_per_meter

                cables.append(row)
    except FileNotFoundError:
        print(f"Warning: {filepath} not found. Using default cable data.")
        cables = [
            {"name": "1C 16mm²", "cable_type": "Power", "cable_description": "PVC Insulated", "brand": "Olex", "cores": 1,
             "conductor_size_mm2": 16, "conductor_type": "Copper", "insulation": "X-90", "sheath": "PVC", "voltage_rating": "0.6/1 kV",
             "overall_diameter_mm": 9.3, "weight_per_meter_kg": 1.0},
        ]
    return cables


cable_db = load_cable_db()

ladder_db = [100, 150, 200, 300, 400, 500, 600, 700, 800, 1000]

def cable_cross_section_area(diameter_mm):
    return pi * (diameter_mm / 2) ** 2

def calculate_required_width(cables, layout='flat', spacing=10):
    """
    Estimate ladder width in mm needed to fit cables side by side in given layout.
    spacing = mm space between cables
    
    Layouts:
    - 'flat': cables laid flat side by side horizontally
    - 'trefoil': cables grouped in 3, triangular pattern (approximate width)
    - 'spaced': cables separated individually with spacing
    
    Returns total width required.
    """

    if not cables:
        return 0

    # Sum widths depending on layout:
    if layout == 'flat':
        # sum diameters + spacing between cables (spacing * (n-1))
        total_diameter = sum(c['diameter_mm'] * c.get('quantity', 1) for c in cables)
        n = sum(c.get('quantity',1) for c in cables)
        return total_diameter + spacing * (n - 1)

    elif layout == 'trefoil':
        # Group cables by 3, width approx 2 x diameter of largest cable in group + spacing
        total_cables = sum(c.get('quantity',1) for c in cables)
        max_diameter = max(c['diameter_mm'] for c in cables)
        groups = (total_cables + 2) // 3
        # Approximate width as groups * (2 * max_diameter + spacing)
        return groups * (2 * max_diameter + spacing)

    elif layout == 'spaced':
        # Add spacing after each cable including last
        total_diameter = sum(c['diameter_mm'] * c.get('quantity', 1) for c in cables)
        n = sum(c.get('quantity',1) for c in cables)
        return total_diameter + spacing * n

    else:
        # Default to flat
        total_diameter = sum(c['diameter_mm'] * c.get('quantity', 1) for c in cables)
        n = sum(c.get('quantity',1) for c in cables)
        return total_diameter + spacing * (n - 1)

def recommend_ladder_width(required_width, options=ladder_db):
    # Find smallest ladder width option >= required_width
    for w in sorted(options):
        if w >= required_width:
            return w
    return options[-1]  # Return largest if none fit

@app.route('/')
def index():
    # pass full cable_db (all columns) to template
    return render_template('index.html', cable_db=cable_db)

@app.route('/api/cables')
def api_cables():
    # Return full cable details as JSON, all columns
    return jsonify(cable_db)

if __name__ == '__main__':
    app.run(debug=True)
