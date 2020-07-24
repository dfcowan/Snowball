function periodForAccount(a, p) {
    let x = { ...a };
    x.interest = (x.balance * x.interestRate / 12);
    x.balance += x.interest;
    x.payment = -1*p;
    x.balance -= p;
    x.balance *= 100;
    x.balance = Math.round(x.balance);
    x.balance /= 100;
    return x;
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

let monthlyBudget = 1000.0;
let accounts = [{
    id: uuidv4(),
    name: "Example",
    balance: 2209.0,
    interestRate: 0.2524,
    minimumPayment: 37.0
}];

function loadFromLocalStorage() {
    let mb = parseFloat(localStorage.getItem('monthlyBudget'));
    if (mb) {
        monthlyBudget = mb;
    }
    let ajs = JSON.parse(localStorage.getItem('accounts'));
    if (ajs) {
        accounts = ajs;
    }
}

loadFromLocalStorage();

var model = new Vue({
    el: '#app',
    data: {
        monthlyBudget: monthlyBudget,
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
                balance: 0.0,
                interestRate: 0.0,
                minimumPayment: 0.0
            });
        },
        removeAccount: function (id) {
            this.accounts = this.accounts.filter(a => a.id != id);
        }
    },
    computed: {
        sortedAccounts: function () {
            return Array.from(this.accounts).sort(function (a, b) { return b.balance - a.balance });
        },
        totalBalance: function () {
            return this.accounts.reduce(function (t, a) { return t + a.balance }, 0);
        },
        simulatedAmortization: function () {
            if (typeof this.monthlyBudget != "number") {
                this.monthlyBudget = parseFloat(this.monthlyBudget);
            }
            this.accounts.forEach(function (a) {
                if (typeof a.balance != "number") {
                    a.balance = parseFloat(a.balance);
                }
                if (typeof a.interestRate != "number") {
                    a.interestRate = parseFloat(a.interestRate);
                }
                if (typeof a.minimumPayment != "number") {
                    a.minimumPayment = parseFloat(a.minimumPayment);
                }
            });

            localStorage.setItem('monthlyBudget', this.monthlyBudget);
            localStorage.setItem('accounts', JSON.stringify(this.accounts));

            if (this.monthlyBudget < this.accounts.reduce(function (t, a) { return t + a.minimumPayment }, 0)) {
                return [];
            }

            let nextMonth = [];
            for (let i = 0; i < this.accounts.length; i++){
                nextMonth.push({
                    ...this.accounts[i]
                });
            }
            nextMonth = nextMonth.sort(function (a, b) { return b.balance - a.balance });

            let months = [];
            let totalBalance = nextMonth.reduce(function (t, a) { return t + a.balance },0);
            while (totalBalance > 0 && months.length < 1200) {
                let monthlyAccounts = [];
                let snowballPayment = this.monthlyBudget;

                for (let i = 0; i < nextMonth.length; i++){
                    let payment =  nextMonth[i].minimumPayment;
                    if (nextMonth[i].balance < payment)                    {
                        payment = nextMonth[i].balance;
                    }

                    snowballPayment -= payment;
                    monthlyAccounts.push(periodForAccount(nextMonth[i], payment));
                }

                let snowballSave = snowballPayment;
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
                    simulatedAccounts: monthlyAccounts,
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
