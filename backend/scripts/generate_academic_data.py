import json

import numpy as np
from scipy import optimize as opt

W = np.array([
    [259, 355, 214, 90],
    [81, 122, 81, 35],
    [28, 47, 25, 7],
    [146, 204, 98, 48]
])
daily_totals = np.array([265, 286, 248, 312, 286, 211, 232])
target_cov = np.array([
    [224.175, 69.272, 33.590, 126.122],
    [69.272, 28.914, 10.888, 34.672],
    [33.590, 10.888, 6.448, 18.725],
    [126.122, 34.672, 18.725, 83.249]
])

ratios = daily_totals / 1840.0
x0 = np.zeros((7, 4, 4))
for d in range(7):
    x0[d] = ratios[d] * W

def loss(x_flat):
    x = x_flat.reshape((7, 4, 4))
    obs = x.transpose((0, 2, 1)).reshape((28, 4))
    cov = np.cov(obs, rowvar=False, ddof=1)
    cov_loss = np.sum((cov - target_cov)**2)
    w_loss = np.sum((x.sum(axis=0) - W)**2)
    d_loss = np.sum((x.sum(axis=(1, 2)) - daily_totals)**2)
    spec_loss = (x[5, 1, 2] - 18)**2
    return cov_loss + 1000 * (w_loss + d_loss + spec_loss)

res = opt.minimize(loss, x0.flatten(), method='L-BFGS-B', bounds=[(0, None)]*112)
x_opt = res.x.reshape((7, 4, 4))

c = -2 * x_opt.flatten()
A_eq = []
b_eq = []
for s in range(4):
    for t in range(4):
        row = np.zeros((7, 4, 4))
        row[:, s, t] = 1
        A_eq.append(row.flatten())
        b_eq.append(W[s, t])

for d in range(7):
    row = np.zeros((7, 4, 4))
    row[d, :, :] = 1
    A_eq.append(row.flatten())
    b_eq.append(daily_totals[d])

row = np.zeros((7, 4, 4))
row[5, 1, 2] = 1
A_eq.append(row.flatten())
b_eq.append(18)

integrality = np.ones(112)
milp_res = opt.milp(c=c, integrality=integrality, constraints=opt.LinearConstraint(A_eq, b_eq, b_eq), bounds=opt.Bounds(0, np.inf))
X_exact = milp_res.x.reshape((7, 4, 4)).astype(int)

days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
services = ["B&W Printing", "Colour Printing", "Binding", "Photocopying"]
rows = []
for d in range(7):
    for s in range(4):
        rows.append({
            "Day": days[d],
            "Service": services[s],
            "9 AM–11 AM": int(X_exact[d, s, 0]),
            "11 AM–1 PM": int(X_exact[d, s, 1]),
            "1 PM–4 PM": int(X_exact[d, s, 2]),
            "4 PM–6 PM": int(X_exact[d, s, 3])
        })

with open("app/exact_dataset.json", "w") as f:
    json.dump(rows, f, indent=2)

print("Exact dataset generated successfully.")
