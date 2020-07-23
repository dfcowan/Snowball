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

var model = new Vue({
    el: '#app',
    data: {
        monthlyBudget: 100,
        accounts: [
            {
                name: "Example",
                balance: 2209,
                interestRate: 0.2524,
                minimumPayment: 37
            }
        ]
    },
    filters: {
        formatPercentage: function (p) {
            return (p * 100).toFixed(2) + '%';
        },
        formatDollar: function (d) {
            return d.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            });
        }
    },
    computed: {
        sortedAccounts: function () {
            return this.accounts.sort(function (a, b) { return b.balance - a.balance });
        },
        simulatedAmortization: function () {
            let nextMonth = [];
            for (let i = 0; i < this.accounts.length; i++){
                nextMonth.push({
                    ...this.accounts[i]
                });
            }
            nextMonth = nextMonth.sort(function (a, b) { return b.balance - a.balance });

            let months = [];
            let totalBalance = nextMonth.reduce(function (t, a) { return t + a.balance },0);
            while (totalBalance > 0) {
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
                    totalBalance: totalBalance,
                    snowballPayment: snowballSave
                });

                nextMonth = monthlyAccounts.sort(function (a, b) { return b.balance - a.balance });
            }
            return months;
        }
    }
});