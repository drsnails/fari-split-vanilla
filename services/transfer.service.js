function round(x) {
	return Math.round(x / 0.5) * 0.5
}

function getPaymentTrans(users) {
	users = structuredClone(users)
	users.sort((user1, user2) => user2.amount - user1.amount)

	const sum = users.reduce((acc, user) => acc + user.amount, 0)
	const avg = sum / users.length

	// tolerance to avoid floating issues
	const underAvgUsers = users.filter(user => user.amount < avg - 0.005)
	const overAvgUsers = users.filter(user => user.amount > avg + 0.005)

	const results = []

	for (let underAvgUser of underAvgUsers) {
		let amountToPay = round(avg - underAvgUser.amount)

		for (let overAvgUser of overAvgUsers) {
			const amountToReceive = round(overAvgUser.amount - avg)
			if (amountToReceive <= 0.005) continue

			if (amountToReceive + 0.005 >= amountToPay) {
				underAvgUser.amount = round(underAvgUser.amount + amountToPay)
				overAvgUser.amount = round(overAvgUser.amount - amountToPay)

				results.push(
					createTransaction(
						underAvgUser.name,
						overAvgUser.name,
						amountToPay
					)
				)
				break
			}

			underAvgUser.amount = round(underAvgUser.amount + amountToReceive)
			overAvgUser.amount = round(overAvgUser.amount - amountToReceive)

			results.push(
				createTransaction(
					underAvgUser.name,
					overAvgUser.name,
					amountToReceive
				)
			)
			amountToPay = round(amountToPay - amountToReceive)
		}
	}

	return { results, avg: round(avg) }
}

function createTransaction(from, to, amount) {
	return { from, to, amount: round(amount) }
}

function checkResults(users, avg) {
	return users.every(user => user.amount.toFixed(2) === avg.toFixed(2))
}
