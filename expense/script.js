let members = [];
let expenses = [];
const STORAGE_KEY = "expenseSplitterData";

const memberForm = document.getElementById("memberForm");
const memberName = document.getElementById("memberName");
const memberEmail = document.getElementById("memberEmail");
const memberList = document.getElementById("memberList");
const totalMembers = document.getElementById("totalMembers");
const message = document.getElementById("message");

const expenseForm = document.getElementById("expenseForm");
const expenseTitle = document.getElementById("expenseTitle");
const expenseAmount = document.getElementById("expenseAmount");
const paidBy = document.getElementById("paidBy");
const splitAmong = document.getElementById("splitAmong");
const expenseList = document.getElementById("expenseList");
const balanceList = document.getElementById("balanceList");
const settleList = document.getElementById("settleList");
const resetBtn = document.getElementById("resetBtn");

function showMessage(text) {
    message.textContent = text;
}

function getDisplayName(member) {
    const sameNameExists = members.some(function (other) {
        return other.id !== member.id &&
               other.name.toLowerCase() === member.name.toLowerCase();
    });

    if (sameNameExists && member.email) {
        return member.name + " (" + member.email + ")";
    }
    return member.name;
}

function getMemberName(id) {
    const member = members.find(function (m) {
        return m.id === id;
    });
    return member ? getDisplayName(member) : "Unknown";
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseAmount(text) {
    const clean = text.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
    const paise = Math.round(parseFloat(clean) * 100);
    return paise > 0 ? paise : null;
}

function formatMoney(paise) {
    return "₹" + (Math.abs(paise) / 100).toFixed(2);
}

function createItem(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ members: members, expenses: expenses }));
}

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) {
            members = saved.members || [];
            expenses = saved.expenses || [];
        }
    } catch (error) {
        members = [];
        expenses = [];
    }
}

function refreshAll() {
    saveData();
    displayMembers();
    displayExpenses();
    displayBalances();
    displaySettleUp();
}

memberForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = memberName.value.trim();
    const email = memberEmail.value.trim().toLowerCase();

    if (name === "") {
        showMessage("Please enter a member name.");
        return;
    }

    if (email === "") {
        showMessage("Please enter the member's Gmail.");
        return;
    }

    if (!isValidEmail(email)) {
        showMessage("Please enter a valid Gmail address.");
        return;
    }

    const exists = members.some(function (member) {
        return (member.email || "").toLowerCase() === email;
    });
    if (exists) {
        showMessage("This person is already added (same Gmail).");
        return;
    }

    if (members.length >= 10) {
        showMessage("Maximum 10 members are allowed.");
        return;
    }

    members.push({ id: Date.now(), name: name, email: email });

    memberName.value = "";
    memberEmail.value = "";
    showMessage("Member added successfully!");
    refreshAll();
});

function displayMembers() {
    memberList.innerHTML = "";

    members.forEach(function (member) {
        const div = document.createElement("div");
        const name = document.createElement("span");
        const removeBtn = document.createElement("button");

        name.textContent = member.name + (member.email ? " (" + member.email + ") " : " ");
        removeBtn.textContent = "Remove";

        removeBtn.addEventListener("click", function () {
            removeMember(member.id);
        });

        div.appendChild(name);
        div.appendChild(removeBtn);
        memberList.appendChild(div);
    });

    totalMembers.textContent = members.length;

    updatePaidByDropdown();
    updateSplitAmong();
}

function removeMember(id) {
    const hasExpenses = expenses.some(function (expense) {
        return expense.paidBy === id || expense.splitMembers.includes(id);
    });

    if (hasExpenses) {
        showMessage("Cannot remove a member who has expenses.");
        return;
    }

    members = members.filter(function (member) {
        return member.id !== id;
    });

    showMessage("Member removed successfully!");
    refreshAll();
}
function updatePaidByDropdown() {
    const previous = paidBy.value;

    paidBy.innerHTML = '<option value="">Select member</option>';

    members.forEach(function (member) {
        const option = document.createElement("option");
        option.value = member.id;
        option.textContent = getDisplayName(member);
        paidBy.appendChild(option);
    });

    paidBy.value = previous;
}

function updateSplitAmong() {
    const unticked = [];
    splitAmong.querySelectorAll("input").forEach(function (box) {
        if (!box.checked) unticked.push(box.value);
    });

    splitAmong.innerHTML = "";

    members.forEach(function (member) {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.value = member.id;
        checkbox.checked = !unticked.includes(String(member.id));

        label.appendChild(checkbox);
        label.append(" " + getDisplayName(member) + " ");
        splitAmong.appendChild(label);
    });
}

function splitEqually(total, ids) {
    const shares = {};
    const base = Math.floor(total / ids.length);
    let leftover = total - base * ids.length;

    ids.forEach(function (id) {
        shares[id] = base;
        if (leftover > 0) {
            shares[id] += 1;
            leftover--;
        }
    });
    return shares;
}

expenseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = expenseTitle.value.trim();
    const amount = parseAmount(expenseAmount.value);
    const payerId = Number(paidBy.value);

    const splitMembers = [];
    splitAmong.querySelectorAll("input:checked").forEach(function (box) {
        splitMembers.push(Number(box.value));
    });

    if (members.length < 2) {
        showMessage("Add at least 2 members first.");
        return;
    }
    if (title === "") {
        showMessage("Please enter an expense title.");
        return;
    }
    if (amount === null) {
        showMessage("Amount must be a positive number with at most 2 decimals.");
        return;
    }
    if (paidBy.value === "") {
        showMessage("Please select who paid.");
        return;
    }
    if (splitMembers.length === 0) {
        showMessage("Select at least one member to split among.");
        return;
    }

    expenses.push({
        id: Date.now(),
        title: title,
        amount: amount,
        paidBy: payerId,
        splitMembers: splitMembers,
        shares: splitEqually(amount, splitMembers)
    });

    expenseTitle.value = "";
    expenseAmount.value = "";
    showMessage("Expense added successfully!");
    refreshAll();
});

function deleteExpense(id) {
    expenses = expenses.filter(function (expense) {
        return expense.id !== id;
    });
    showMessage("Expense deleted.");
    refreshAll();
}

function displayExpenses() {
    expenseList.innerHTML = "";

    if (expenses.length === 0) {
        expenseList.appendChild(createItem("No expenses yet."));
        return;
    }

    const newestFirst = expenses.slice().sort(function (a, b) {
        return b.id - a.id;
    });

    newestFirst.forEach(function (expense) {
        const div = document.createElement("div");
        const names = expense.splitMembers.map(getMemberName).join(", ");

        const text = document.createElement("span");
        text.textContent =
            expense.title + " - " + formatMoney(expense.amount) +
            " | Paid by " + getMemberName(expense.paidBy) +
            " | Split among: " + names + " ";

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function () {
            deleteExpense(expense.id);
        });

        div.appendChild(text);
        div.appendChild(deleteBtn);
        expenseList.appendChild(div);
    });
}

function calculateBalances() {
    const balances = {};

    members.forEach(function (member) {
        balances[member.id] = { paid: 0, share: 0, net: 0 };
    });

    expenses.forEach(function (expense) {
        balances[expense.paidBy].paid += expense.amount;
        expense.splitMembers.forEach(function (id) {
            balances[id].share += expense.shares[id];
        });
    });

    members.forEach(function (member) {
        const b = balances[member.id];
        b.net = b.paid - b.share;
    });

    return balances;
}

function displayBalances() {
    balanceList.innerHTML = "";

    if (members.length === 0) {
        balanceList.appendChild(createItem("No members yet."));
        return;
    }

    const balances = calculateBalances();

    members.forEach(function (member) {
        const b = balances[member.id];
        let status = "settled up";
        if (b.net > 0) status = "+" + formatMoney(b.net) + " (gets back)";
        if (b.net < 0) status = "-" + formatMoney(b.net) + " (owes)";

        balanceList.appendChild(
            createItem(
                getDisplayName(member) + " | Paid: " + formatMoney(b.paid) +
                " | Share: " + formatMoney(b.share) + " | Net: " + status
            )
        );
    });
}

function findMinimumPayments(nets) {
    const people = Object.keys(nets)
        .filter(function (id) { return nets[id] !== 0; })
        .map(function (id) { return { id: Number(id), amount: nets[id] }; });

    const n = people.length;
    if (n === 0) return [];

    const full = (1 << n) - 1;
    const sum = new Array(full + 1).fill(0);
    const bestGroups = new Array(full + 1).fill(0);
    const pick = new Array(full + 1).fill(-1);

    for (let mask = 1; mask <= full; mask++) {
        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i))) continue;
            const prev = mask ^ (1 << i);
            sum[mask] = sum[prev] + people[i].amount;
            if (pick[mask] === -1 || bestGroups[prev] > bestGroups[mask]) {
                bestGroups[mask] = bestGroups[prev];
                pick[mask] = i;
            }
        }
        if (sum[mask] === 0) bestGroups[mask] += 1;
    }

    // Walk down from everyone; each time the rest sums to 0, one group is complete
    const groups = [];
    let current = [];
    let mask = full;
    while (mask) {
        const i = pick[mask];
        current.push(people[i]);
        mask ^= (1 << i);
        if (sum[mask] === 0) {
            groups.push(current);
            current = [];
        }
    }

    // Inside each group: biggest debtor pays biggest creditor
    const payments = [];
    groups.forEach(function (group) {
        const debtors = group.filter(function (p) { return p.amount < 0; })
            .map(function (p) { return { id: p.id, amount: -p.amount }; });
        const creditors = group.filter(function (p) { return p.amount > 0; })
            .map(function (p) { return { id: p.id, amount: p.amount }; });

        while (debtors.length > 0 && creditors.length > 0) {
            debtors.sort(function (a, b) { return b.amount - a.amount; });
            creditors.sort(function (a, b) { return b.amount - a.amount; });

            const debtor = debtors[0];
            const creditor = creditors[0];
            const pay = Math.min(debtor.amount, creditor.amount);

            payments.push({ from: debtor.id, to: creditor.id, amount: pay });

            debtor.amount -= pay;
            creditor.amount -= pay;
            if (debtor.amount === 0) debtors.shift();
            if (creditor.amount === 0) creditors.shift();
        }
    });

    return payments;
}

function displaySettleUp() {
    settleList.innerHTML = "";

    const balances = calculateBalances();
    const nets = {};
    members.forEach(function (member) {
        nets[member.id] = balances[member.id].net;
    });

    const payments = findMinimumPayments(nets);

    if (payments.length === 0) {
        settleList.appendChild(createItem("All settled up!"));
        return;
    }

    payments.forEach(function (p) {
        settleList.appendChild(
            createItem(getMemberName(p.from) + " pays " + getMemberName(p.to) + " " + formatMoney(p.amount))
        );
    });
}

let resetArmed = false;

resetBtn.addEventListener("click", function () {
    if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = "Click again to confirm";
        setTimeout(function () {
            resetArmed = false;
            resetBtn.textContent = "Reset group";
        }, 3000);
        return;
    }

    resetArmed = false;
    resetBtn.textContent = "Reset group";
    members = [];
    expenses = [];
    localStorage.removeItem(STORAGE_KEY);
    showMessage("Group reset.");
    refreshAll();
});

loadData();
refreshAll();