import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PrefrontalDispatcher } from '../prefrontalDispatcher.js'

const dispatcher = new PrefrontalDispatcher({ reflexThreshold: 0.8 })

describe('PrefrontalDispatcher (PT-PT caótico)', () => {
    it('deteta intenção financeira em texto com ruído', () => {
        const decision = dispatcher.evaluate({
            signalType: 'voice',
            normalizedText: 'ya fatura continente 45,90 eur foi hoje',
        })

        assert.equal(decision.module, 'FinanceModule')
        assert.equal(decision.strictParametersMet, true)
        assert.equal(decision.extracted.merchant?.toLowerCase(), 'continente')
        assert.equal(decision.extracted.amount, 45.9)
    })

    it('deteta todo em frase vernacular', () => {
        const decision = dispatcher.evaluate({
            signalType: 'voice',
            normalizedText: 'mano lembra me pagar o seguro da carrinha amanha',
        })

        assert.equal(decision.module, 'TodoModule')
        assert.equal(decision.strictParametersMet, true)
        assert.ok(decision.extracted.todoTitle)
    })

    it('deteta cripto com ação + símbolo + preço', () => {
        const decision = dispatcher.evaluate({
            signalType: 'text',
            normalizedText: 'bro comprar 0.05 btc a 62000 usd em dca',
        })

        assert.equal(decision.module, 'CryptoModule')
        assert.equal(decision.strategy, 'tactical_reflex')
        assert.equal(decision.extracted.cryptoAction, 'buy')
        assert.equal(decision.extracted.cryptoSymbol, 'BTC')
        assert.equal(decision.extracted.cryptoAmount, 0.05)
    })

    it('deteta links mesmo com frase informal', () => {
        const decision = dispatcher.evaluate({
            signalType: 'voice',
            normalizedText: 'guarda ai este site interessante www.openai.com/research',
        })

        assert.equal(decision.module, 'LinksModule')
        assert.equal(decision.strategy, 'tactical_reflex')
        assert.equal(decision.extracted.linkUrl, 'https://www.openai.com/research')
    })

    it('fica em semantic_deep_dive quando faltam campos críticos', () => {
        const cryptoDecision = dispatcher.evaluate({
            signalType: 'voice',
            normalizedText: 'quero comprar cripto',
        })
        const linkDecision = dispatcher.evaluate({
            signalType: 'voice',
            normalizedText: 'guarda este link para mim',
        })

        assert.equal(cryptoDecision.module, 'CryptoModule')
        assert.equal(cryptoDecision.strategy, 'semantic_deep_dive')
        assert.equal(linkDecision.module, 'LinksModule')
        assert.equal(linkDecision.strategy, 'semantic_deep_dive')
    })
})
