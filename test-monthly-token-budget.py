#!/usr/bin/env python3
"""
Simulación simple de presupuesto mensual por usuario del chat.
Ejecutar: python3 test-monthly-token-budget.py
"""

from dataclasses import dataclass


@dataclass
class Pricing:
    input_per_1m: float = 0.15
    output_per_1m: float = 0.60


def estimate_cost(prompt_tokens: int, completion_tokens: int, pricing: Pricing) -> float:
    return (prompt_tokens / 1_000_000.0) * pricing.input_per_1m + (completion_tokens / 1_000_000.0) * pricing.output_per_1m


def run_simulation(interactions: int, avg_prompt_tokens: int, avg_completion_tokens: int, pricing: Pricing) -> float:
    total = 0.0
    for _ in range(interactions):
        total += estimate_cost(avg_prompt_tokens, avg_completion_tokens, pricing)
    return total


def main():
    pricing = Pricing()

    # Escenario objetivo (asistente optimizado):
    # 120 interacciones/mes, prompt 1200 tokens, respuesta 350 tokens.
    estimated = run_simulation(
        interactions=120,
        avg_prompt_tokens=1200,
        avg_completion_tokens=350,
        pricing=pricing,
    )

    print(f"Estimated monthly cost: ${estimated:.4f}")
    if estimated > 1.0:
        raise SystemExit("FAIL: exceeds USD 1.00 target per active user/month")

    print("OK: monthly budget scenario within USD 1.00")


if __name__ == "__main__":
    main()
