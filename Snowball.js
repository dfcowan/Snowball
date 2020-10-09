function periodForAccount(a, p) {
    let x = { ...a };
    x.interest = roundToPenny(x.balance * x.interestRate / 12);
    x.balance += x.interest;
    x.payment = -1*p;
    x.balance -= p;
    x.balance = roundToPenny(x.balance);
    return x;
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function roundToPenny(x) {
    return Math.round(x * 100) / 100;
}

let monthlyBudget = 1000;
let inputMonthlyBudget = "1000.0";
let accounts = [{
    id: uuidv4(),
    name: "Example",
    balance: 2209.0,
    inputBalance: "2209.0",
    interestRate: 0.2524,
    inputInterestRate: "25.24",
    minimumPayment: 37.0,
    inputMinimumPayment: "37.0",
    backgroundColor: "#FFFFFF"
}];

function loadFromLocalStorage() {
    let mb = parseFloat(localStorage.getItem('inputMonthlyBudget'));
    if (mb) {
        inputMonthlyBudget = mb;
    }
    let ajs = JSON.parse(localStorage.getItem('accounts'));
    if (ajs) {
        accounts = ajs;
    }
    accounts.forEach(function (a) {
        if (!a.inputBalance && a.balance) {
            a.inputBalance = a.balance
        }
        if (!a.inputInterestRate && a.interestRate) {
            a.inputInterestRate = a.interestRate
        }
        if (!a.inputMinimumPayment && a.minimumPayment) {
            a.inputMinimumPayment = a.minimumPayment
        }
        if (!a.backgroundColor) {
            a.backgroundColor = "#FFFFFF"
        }
    });
}

loadFromLocalStorage();

var model = new Vue({
    el: '#app',
    data: {
        monthlyBudget: monthlyBudget,
        inputMonthlyBudget: inputMonthlyBudget,
        accounts: accounts
    },
    filters: {
        formatPercentage: function (p) {
            return (parseFloat(p) * 100).toFixed(2) + '%';
        },
        formatDollar: function (d) {
            return parseFloat(d).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            });
        }
    },
    methods: {
        addAccount: function () {
            this.accounts.push({
                id: uuidv4(),
                name: "New Account",
                balance: 0,
                inputBalance: "0.0",
                inputInterestRate: "0.0",
                interestRate: 0,
                inputMinimumPayment: "0.0",
                minimumPayment: 0,
                backgroundColor: "#FFFFFF"
            });
        },
        removeAccount: function (id) {
            this.accounts = this.accounts.filter(a => a.id != id);
        }
    },
    computed: {
        durationDescription: function () {
            let months = this.simulatedAmortization.length;
            if (months === 0) {
                return "";
            }

            let desc = "";
            if (months < 12) {
                desc = months + " months ";
            }
            else {
                let years = Math.floor(months / 12);
                let remMonths = months % 12;
                if (remMonths === 0) {
                    desc = months + " months (" + years + " years) ";
                }
                else {
                    desc = months + " months (" + years + " years and " + remMonths + " months) ";
                }
            }

            return "It will take approximately " + desc + " to payoff all your debt.";
        },
        totalInterest: function () {
            return this.simulatedAmortization.reduce(function (t, m) { return t + m.totalInterest }, 0);
        },
        totalPaid: function () {
            return -1 * this.simulatedAmortization.reduce(function (t, m) { return t + m.totalPayment }, 0);
        },
        budgetError: function () {
            if (!this.monthlySnowballPayment || this.monthlySnowballPayment < 0) {
                return "Your minimum payments exceed your budget";
            }

            return "";
        },
        sortedAccounts: function () {
            return Array.from(this.accounts).sort(function (a, b) { return a.balance - b.balance });
        },
        totalBalance: function () {
            return roundToPenny(this.accounts.reduce(function (t, a) { return t + a.balance }, 0));
        },
        totalMinimumPayments: function () {
            return roundToPenny(this.accounts.reduce(function (t, a) { return t + a.minimumPayment }, 0));
        },
        monthlySnowballPayment: function () {
            return this.monthlyBudget - this.totalMinimumPayments;
        },
        simulatedAmortization: function () {
            this.monthlyBudget = roundToPenny(parseFloat(this.inputMonthlyBudget));
            this.accounts.forEach(function (a) {
                a.balance = roundToPenny(parseFloat(a.inputBalance));
                a.interestRate = parseFloat(a.inputInterestRate) / 100;
                a.minimumPayment = roundToPenny(parseFloat(a.inputMinimumPayment));
            });

            localStorage.setItem('inputMonthlyBudget', this.inputMonthlyBudget);
            localStorage.setItem('accounts', JSON.stringify(this.accounts));

            if (this.monthlyBudget < this.totalMinimumPayments) {
                return [];
            }

            let nextMonth = [];
            for (let i = 0; i < this.accounts.length; i++){
                nextMonth.push({
                    ...this.accounts[i]
                });
            }
            nextMonth.sort(function (a, b) { return b.balance - a.balance });

            let months = [];
            let totalBalance = nextMonth.reduce(function (t, a) { return t + a.balance },0);
            while (totalBalance > 0 && months.length < 1200) {
                let monthlyAccounts = [];
                let snowballPayment = this.monthlyBudget;

                for (let i = 0; i < nextMonth.length; i++) {
                    let payment =  nextMonth[i].minimumPayment;
                    if (nextMonth[i].balance < payment)                    {
                        payment = nextMonth[i].balance;
                    }

                    snowballPayment -= payment;
                    monthlyAccounts.push(periodForAccount(nextMonth[i], payment));
                }

                if (snowballPayment > 0 && monthlyAccounts.filter(a => a.balance > 0).length > 0) {
                    let i = monthlyAccounts.length - 1;
                    while(i >= 0 && snowballPayment > 0){
                        if (monthlyAccounts[i].balance > 0) {
                            if (monthlyAccounts[i].balance > snowballPayment) {
                                monthlyAccounts[i].balance -= snowballPayment;
                                monthlyAccounts[i].payment -= snowballPayment;
                                snowballPayment = 0;
                            }
                            else {
                                monthlyAccounts[i].payment -= monthlyAccounts[i].balance;
                                snowballPayment -= monthlyAccounts[i].balance;
                                monthlyAccounts[i].balance = 0;
                            }
                        }
                        i--;
                    }
                }

                totalBalance = monthlyAccounts.reduce(function (t, a) { return t + a.balance }, 0);
                months.push({
                    simulatedAccounts: Array.from(monthlyAccounts).sort(function (a, b) { if (a.balance !== b.balance) { return a.balance - b.balance } return b.payment - a.payment }),
                    totalInterest: monthlyAccounts.reduce(function (t, a) { return t + a.interest }, 0),
                    totalPayment: monthlyAccounts.reduce(function (t, a) { return t + a.payment }, 0),
                    totalBalance: totalBalance
                });

                nextMonth = monthlyAccounts.sort(function (a, b) { return b.balance - a.balance });
            }
            return months;
        }
    }
});
