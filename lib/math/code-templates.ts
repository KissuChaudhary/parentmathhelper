export type SupportedMathProblemType =
  | "arithmetic"
  | "algebra"
  | "calculus_derivative"
  | "calculus_integral"
  | "calculus_limit"
  | "trigonometry"
  | "differential_equation"
  | "linear_algebra"
  | "probability"
  | "statistics"
  | "geometry"
  | "general_symbolic";

export function buildSympyCode(problem: string, problemType: SupportedMathProblemType) {
  const rawLiteral = JSON.stringify(problem);

  if (problemType === "arithmetic") {
    return `import re
from sympy import sympify, simplify
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("×", "*").replace("÷", "/")
text = re.sub(r"(?i)^\\s*(what\\s+is|calculate|compute|evaluate)\\s+", "", text).strip(" .?")
text = text.replace(" plus ", " + ").replace(" minus ", " - ").replace(" times ", " * ").replace(" divided by ", " / ")
try:
    print(simplify(sympify(text)))
except Exception as error:
    print("ARITHMETIC_PARSE_ERROR: " + str(error))`;
  }

  if (problemType === "calculus_derivative") {
    return `import re
from sympy import symbols, diff, sympify
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
x = symbols('x')
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt").replace("×", "*").replace("÷", "/")
transformations = standard_transformations + (implicit_multiplication_application,)

def normalize_expr(expr):
    cleaned = expr.strip(" .:?")
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*(\\d+)\\b", r"\\1**\\2", cleaned)
    cleaned = re.sub(r"(\\))\\s*(\\d+)\\b", r"\\1**\\2", cleaned)
    cleaned = re.sub(r"sqrt\\s*\\*\\*\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"sqrt\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*sqrt\\s*\\(", r"\\1*sqrt(", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*([a-zA-Z(])", r"\\1*\\2", cleaned)
    cleaned = re.sub(r"(\\))\\s*([a-zA-Z(\\d])", r"\\1*\\2", cleaned)
    return cleaned

def safe_parse(expr):
    normalized = normalize_expr(expr)
    try:
        return parse_expr(normalized, transformations=transformations, local_dict=locals())
    except Exception:
        return sympify(normalized, locals=locals())

expr_match = re.search(r"(?i)(?:derivative\\s+of|differentiate\\s+)(.+?)(?:\\s+with\\s+respect\\s+to\\s+[a-zA-Z]|\\s+wrt\\s+[a-zA-Z]|$)", text)
expr_source = expr_match.group(1).strip() if expr_match else text
var_match = re.search(r"(?i)(?:with\\s+respect\\s+to|wrt)\\s*([a-zA-Z])", text)
var_name = var_match.group(1) if var_match else "x"
var_symbol = symbols(var_name)
expr = safe_parse(expr_source)
result = diff(expr, var_symbol)
print(result)`;
  }

  if (problemType === "calculus_integral") {
    return `import re
from sympy import symbols, integrate, sympify, ln, exp, sin, cos, tan, sqrt
x = symbols('x')
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt")
text = re.sub(r"(?i)^\\s*evaluate\\s*the\\s*definite\\s*integral\\s*[:\\s]*", "", text)
text = re.sub(r"(?i)∫\\s*\\(([^)]+)\\s*to\\s*([^)]+)\\)", r"integrate_def(\\1, \\2, ", text)
text = re.sub(r"\\s*dx\\s*$", "", text)

def safe_sympify(val_str):
    cleaned = val_str.replace("^", "**").replace("−", "-").replace("√", "sqrt")
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*(\\d+)\\b", r"\\1**\\2", cleaned)
    cleaned = re.sub(r"(\\))\\s*(\\d+)\\b", r"\\1**\\2", cleaned)
    cleaned = re.sub(r"sqrt\\s*\\*\\*\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"sqrt\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*sqrt\\s*\\(", r"\\1*sqrt(", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*([a-zA-Z(])", r"\\1*\\2", cleaned)
    cleaned = re.sub(r"(\\))\\s*([a-zA-Z(\\d])", r"\\1*\\2", cleaned)
    try:
        return sympify(cleaned)
    except Exception:
        return sympify(cleaned.replace(" ", ""))

if "integrate_def" in text:
    # Handle custom definite integral format from extraction
    match = re.match(r"integrate_def\\(([^,]+),\\s*([^,]+),\\s*(.+)", text)
    if match:
        lower, upper, expr_str = match.groups()
        expr = safe_sympify(expr_str)
        lower_val = safe_sympify(lower)
        upper_val = safe_sympify(upper)
        print(integrate(expr, (x, lower_val, upper_val)))
    else:
        # Fallback to direct extraction if regex fails
        print(integrate(safe_sympify(text), x))
else:
    print(integrate(safe_sympify(text), x))`;
  }

  if (problemType === "calculus_limit") {
    return `import re
from sympy import symbols, limit, sympify
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt").replace("×", "*").replace("÷", "/").replace("→", "->")
transformations = standard_transformations + (implicit_multiplication_application,)

def normalize_expr(expr):
    cleaned = expr.strip(" .:?")
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*(\\d+)\\b", r"\\1**\\2", cleaned)
    cleaned = re.sub(r"(\\))\\s*(\\d+)\\b", r"\\1**\\2", cleaned)
    cleaned = re.sub(r"sqrt\\s*\\*\\*\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"sqrt\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*sqrt\\s*\\(", r"\\1*sqrt(", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*([a-zA-Z(])", r"\\1*\\2", cleaned)
    cleaned = re.sub(r"(\\))\\s*([a-zA-Z(\\d])", r"\\1*\\2", cleaned)
    return cleaned

def safe_parse(expr, local_dict=None):
    local_dict = local_dict or {}
    normalized = normalize_expr(expr)
    try:
        return parse_expr(normalized, transformations=transformations, local_dict={**locals(), **local_dict})
    except Exception:
        return sympify(normalized, locals={**locals(), **local_dict})

var_match = re.search(r"(?i)\\blim\\s*([a-zA-Z])\\s*->", text) or re.search(r"(?i)as\\s+([a-zA-Z])\\s+approaches?", text)
var_name = var_match.group(1) if var_match else "x"
var_symbol = symbols(var_name)

point_match = re.search(r"(?i)\\blim\\s*[a-zA-Z]\\s*->\\s*([^,.;\\s\\)]+)", text) or re.search(r"(?i)approaches?\\s*([^,.;\\s\\)]+)", text)
point_source = point_match.group(1) if point_match else "0"
point_value = safe_parse(point_source, {var_name: var_symbol})

func_match = re.search(r"(?i)\\bf\\s*\\(\\s*" + re.escape(var_name) + r"\\s*\\)\\s*=\\s*(.+?)(?:[\\n\\r]|$)", text)
if func_match:
    expr_source = func_match.group(1).strip(" .")
else:
    expr_match = re.search(r"(?i)(?:limit\\s+of|find\\s+limit\\s+of|find\\s+lim\\s*)(.+?)(?:\\s+as\\s+[a-zA-Z]\\s+approaches|\\s+where\\s+|$)", text)
    expr_source = expr_match.group(1).strip() if expr_match else text
    expr_source = re.sub(r"(?i)^find\\s+|^calculate\\s+|^compute\\s+", "", expr_source).strip()

expr_source = re.sub(r"(?i)^lim\\s*[a-zA-Z]?\\s*->\\s*[^\\s]+\\s*", "", expr_source).strip()
expr = safe_parse(expr_source, {var_name: var_symbol})
result = limit(expr, var_symbol, point_value)
print(result)`;
  }

  if (problemType === "trigonometry") {
    return `import re
from sympy import symbols, Eq, solve, sympify, simplify, sin, cos, tan, sqrt, Rational
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
x = symbols('x', real=True)
A = symbols('A', real=True)
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt").replace("²", "**2")
transformations = standard_transformations + (implicit_multiplication_application,)

def normalize_target(expr):
    cleaned = expr.strip(" .:?")
    cleaned = re.sub(r"(?i)^the\\s+value\\s+of\\s+", "", cleaned)
    cleaned = re.sub(r"(?i)^value\\s+of\\s+", "", cleaned)
    cleaned = re.sub(r"(?i)^find\\s+", "", cleaned)
    cleaned = re.sub(r"(?i)^evaluate\\s+", "", cleaned)
    cleaned = re.sub(r"(?i)^compute\\s+", "", cleaned)
    cleaned = re.sub(r"(?i)(sin|cos|tan)\\s*\\^?\\s*2\\s*([A-Za-z])", r"\\1(\\2)**2", cleaned)
    cleaned = re.sub(r"(?i)(sin|cos|tan)\\s*([A-Za-z])", r"\\1(\\2)", cleaned)
    cleaned = re.sub(r"\\)\\s*\\(", r")*(", cleaned)
    cleaned = re.sub(r"(\\d)\\s*\\(", r"\\1*(", cleaned)
    cleaned = re.sub(r"\\)\\s*([A-Za-z])", r")*\\1", cleaned)
    return cleaned

def safe_parse(expr, local_dict=None):
    local_dict = local_dict or {}
    normalized = normalize_target(expr)
    try:
        return parse_expr(normalized, transformations=transformations, local_dict={**locals(), **local_dict})
    except Exception:
        return sympify(normalized, locals={**locals(), **local_dict})

expr_match = re.search(r"(?i)(?:value of|evaluate|simplify|compute|find)\\s+(.+?)(?:\\?|$)", text)
target = (expr_match.group(1).strip() if expr_match else text).strip(" :")

condition_match = re.search(r"(?i)(sin|cos|tan)\\s*([A-Za-z])\\s*=\\s*([0-9]+(?:\\.[0-9]+)?(?:\\s*/\\s*[0-9]+(?:\\.[0-9]+)?)?)", text)
if condition_match:
    fn, var_name, value_str = condition_match.groups()
    var_symbol = symbols(var_name, real=True)
    value_expr = safe_parse(value_str, {var_name: var_symbol})
    subs_map = {}
    if fn.lower() == "cos":
        subs_map = {
            cos(var_symbol): value_expr,
            sin(var_symbol): sqrt(1 - value_expr**2),
            tan(var_symbol): sqrt(1 - value_expr**2) / value_expr
        }
    elif fn.lower() == "sin":
        subs_map = {
            sin(var_symbol): value_expr,
            cos(var_symbol): sqrt(1 - value_expr**2),
            tan(var_symbol): value_expr / sqrt(1 - value_expr**2)
        }
    else:
        subs_map = {
            tan(var_symbol): value_expr,
            cos(var_symbol): 1 / sqrt(1 + value_expr**2),
            sin(var_symbol): value_expr / sqrt(1 + value_expr**2)
        }
    expr = safe_parse(target, {var_name: var_symbol})
        print(simplify(expr.subs(subs_map)))
else:
    try:
        if "=" in target:
            left, right = target.split("=", 1)
            eq = Eq(safe_parse(left, {"A": A}), safe_parse(right, {"A": A}))
            print(solve(eq, A))
        else:
            print(simplify(safe_parse(target, {"A": A})))
    except Exception as error:
        print("TRIGONOMETRY_PARSE_ERROR: " + str(error))`;
  }

  if (problemType === "differential_equation") {
    return `from sympy import symbols, Function, Eq, dsolve, sympify
x = symbols('x')
y = Function('y')
raw = ${rawLiteral}
left, right = raw.split("=", 1)
ode = Eq(sympify(left), sympify(right))
print(dsolve(ode, y(x)))`;
  }

  if (problemType === "linear_algebra") {
    return `from sympy import Matrix
print("Please provide explicit matrix notation like [[1,2],[3,4]] for full symbolic solving.")`;
  }

  if (problemType === "probability") {
    return `import re
from math import comb, factorial
from sympy import sympify, simplify, Rational
try:
    from scipy import stats as sp_stats
except Exception:
    sp_stats = None
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-")
lower = text.lower()

def num(pattern):
    match = re.search(pattern, lower)
    return sympify(match.group(1)) if match else None

if "machine" in lower and "defect" in lower and "from machine" in lower:
    percentages = [Rational(item) / 100 for item in re.findall(r"([0-9]+(?:\\.[0-9]+)?)", " ".join(re.findall(r"([0-9]+(?:\\.[0-9]+)?)\\s*%", lower)))]
    machine_order = []
    for letter in re.findall(r"machine\\s+([a-z])", lower):
        if letter not in machine_order:
            machine_order.append(letter)
    query_match = re.search(r"from\\s+machine\\s+([a-z])", lower)
    query_machine = query_match.group(1) if query_match else None
    count = len(machine_order)
    if count >= 2 and len(percentages) >= count * 2 and query_machine in machine_order:
        priors = percentages[:count]
        defects = percentages[count : count * 2]
        total_defect = simplify(sum(priors[i] * defects[i] for i in range(count)))
        idx = machine_order.index(query_machine)
        posterior = simplify((priors[idx] * defects[idx]) / total_defect)
        print(posterior)
    else:
        print("PROBABILITY_PARSE_ERROR: missing machine percentages or defect rates for Bayes computation")
elif "permutation" in lower:
    n = num(r"n\\s*=\\s*([0-9]+)") or num(r"of\\s*([0-9]+)")
    r = num(r"r\\s*=\\s*([0-9]+)") or num(r"choose\\s*([0-9]+)") or num(r"taken\\s*([0-9]+)")
    if n is not None and r is not None:
        print(simplify(factorial(int(n)) / factorial(int(n - r))))
    else:
        print("PROBABILITY_PARSE_ERROR: missing n or r for permutation")
elif "combination" in lower or "choose" in lower:
    n = num(r"n\\s*=\\s*([0-9]+)") or num(r"from\\s*([0-9]+)")
    r = num(r"r\\s*=\\s*([0-9]+)") or num(r"choose\\s*([0-9]+)") or num(r"select\\s*([0-9]+)")
    if n is not None and r is not None:
        print(comb(int(n), int(r)))
    else:
        print("PROBABILITY_PARSE_ERROR: missing n or r for combination")
elif "binomial" in lower or ("exactly" in lower and "success" in lower and "trial" in lower):
    n = num(r"([0-9]+)\\s*trials?") or num(r"n\\s*=\\s*([0-9]+)")
    k = num(r"exactly\\s*([0-9]+)") or num(r"k\\s*=\\s*([0-9]+)")
    p = num(r"p\\s*=\\s*([0-9]*\\.?[0-9]+)") or num(r"probability\\s*(?:of\\s*success)?\\s*(?:is|=)?\\s*([0-9]*\\.?[0-9]+)")
    if n is not None and k is not None and p is not None:
        n_val, k_val = int(n), int(k)
        p_val = sympify(p)
        if sp_stats is not None:
            print(sp_stats.binom.pmf(k_val, n_val, float(p_val)))
        else:
            print(simplify(comb(n_val, k_val) * (p_val ** k_val) * ((1 - p_val) ** (n_val - k_val))))
    else:
        print("PROBABILITY_PARSE_ERROR: missing n, k, or p for binomial")
elif "probability" in lower and ("complement" in lower or "not" in lower):
    p = num(r"p\\s*=\\s*([0-9]*\\.?[0-9]+)") or num(r"probability\\s*(?:is|=)?\\s*([0-9]*\\.?[0-9]+)")
    if p is not None:
        print(simplify(1 - p))
    else:
        print("PROBABILITY_PARSE_ERROR: missing base probability for complement")
else:
    expr_match = re.search(r"(?i)(?:find|calculate|compute|evaluate)\\s+(.+?)(?:\\?|$)", text)
    expr_source = (expr_match.group(1) if expr_match else text).strip(" .:")
    try:
        print(simplify(sympify(expr_source)))
    except Exception as error:
        print("PROBABILITY_PARSE_ERROR: " + str(error))`;
  }

  if (problemType === "statistics") {
    return `import re
import statistics as py_stats
from sympy import sympify, simplify
try:
    import numpy as np
except Exception:
    np = None
try:
    from scipy import stats as sp_stats
except Exception:
    sp_stats = None
try:
    import statsmodels.api as sm
except Exception:
    sm = None
raw = ${rawLiteral}
text = raw.replace("−", "-")
lower = text.lower()

data_match = re.search(r"\\[([^\\]]+)\\]", text)
if data_match:
    values = [float(v.strip()) for v in data_match.group(1).split(",") if v.strip()]
else:
    values = [float(v) for v in re.findall(r"-?\\d+(?:\\.\\d+)?", text)]

if not values:
    print("STATISTICS_PARSE_ERROR: missing numeric dataset")
elif "mean" in lower or "average" in lower:
    print(float(np.mean(values)) if np is not None else simplify(sum(values) / len(values)))
elif "median" in lower:
    print(float(np.median(values)) if np is not None else py_stats.median(values))
elif "mode" in lower:
    if sp_stats is not None:
        mode_result = sp_stats.mode(values, keepdims=True)
        print(float(mode_result.mode[0]))
    else:
        modes = py_stats.multimode(values)
        print(modes[0] if len(modes) == 1 else modes)
elif "variance" in lower:
    if len(values) < 2:
        print("STATISTICS_PARSE_ERROR: variance needs at least two values")
    elif "sample" in lower:
        print(float(np.var(values, ddof=1)) if np is not None else py_stats.variance(values))
    else:
        print(float(np.var(values, ddof=0)) if np is not None else py_stats.pvariance(values))
elif "standard deviation" in lower or "std" in lower:
    if len(values) < 2:
        print("STATISTICS_PARSE_ERROR: standard deviation needs at least two values")
    elif "sample" in lower:
        print(float(np.std(values, ddof=1)) if np is not None else py_stats.stdev(values))
    else:
        print(float(np.std(values, ddof=0)) if np is not None else py_stats.pstdev(values))
else:
    print({
        "count": len(values),
        "mean": float(np.mean(values)) if np is not None else float(sum(values) / len(values)),
        "median": float(np.median(values)) if np is not None else float(py_stats.median(values)),
        "min": float(min(values)),
        "max": float(max(values))
    })`;
  }

  if (problemType === "geometry") {
    return `import re
from sympy import sympify, sqrt, pi, simplify, symbols
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt")
lower = text.lower()
lower = re.sub(r"\\bquestion\\s*\\d+\\s*[:.)-]*\\s*", "", lower).strip()

def num(pattern):
    match = re.search(pattern, lower)
    return sympify(match.group(1)) if match else None

radius = num(r"radius\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
if radius is None:
    radius = num(r"\\br\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)")

distance_from_center = num(r"([0-9]+(?:\\.[0-9]+)?)\\s*(?:cm|m|mm|units)?\\s*from\\s+the\\s+center")
if distance_from_center is None:
    distance_from_center = num(r"distance\\s*(?:from\\s+the\\s+center\\s*)?(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")

base = num(r"base\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
height = num(r"height\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
length = num(r"length\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
width = num(r"width\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
diameter = num(r"diameter\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
if radius is None and diameter is not None:
    radius = diameter / 2

cone_height = num(r"cone\\s+height\\s*(?:of|=)?\\s*([0-9]+(?:\\.[0-9]+)?)")
if cone_height is None:
    cone_height = height

if "chord" in lower and radius is not None and distance_from_center is not None:
    print(simplify(2 * sqrt(radius**2 - distance_from_center**2)))
elif "volume" in lower and "cylinder" in lower:
    if radius is not None and height is not None:
        print(simplify(pi * radius**2 * height))
    else:
        r, h = symbols('r h', positive=True)
        print(simplify(pi * r**2 * h))
elif "surface area" in lower and "cylinder" in lower:
    if radius is not None and height is not None:
        print(simplify(2 * pi * radius * (radius + height)))
    else:
        r, h = symbols('r h', positive=True)
        print(simplify(2 * pi * r * (r + h)))
elif "volume" in lower and "sphere" in lower:
    if radius is not None:
        print(simplify((4 * pi * radius**3) / 3))
    else:
        r = symbols('r', positive=True)
        print(simplify((4 * pi * r**3) / 3))
elif "volume" in lower and "cone" in lower:
    if radius is not None and cone_height is not None:
        print(simplify(pi * radius**2 * cone_height / 3))
    else:
        r, h = symbols('r h', positive=True)
        print(simplify(pi * r**2 * h / 3))
elif "area" in lower and "circle" in lower and radius is not None:
    print(simplify(pi * radius**2))
elif ("circumference" in lower or "perimeter" in lower) and "circle" in lower and radius is not None:
    print(simplify(2 * pi * radius))
elif "area" in lower and "triangle" in lower and base is not None and height is not None:
    print(simplify(base * height / 2))
elif "area" in lower and ("rectangle" in lower or "square" in lower):
    if length is not None and width is not None:
        print(simplify(length * width))
    elif length is not None:
        print(simplify(length**2))
    else:
        l, w = symbols('l w', positive=True)
        print(simplify(l * w))
else:
    expr_match = re.search(r"(?i)(?:find|calculate|compute|simplify|evaluate|solve)\\s+(.+?)(?:\\?|$)", text)
    expr_source = (expr_match.group(1) if expr_match else text).strip(" .:")
    try:
        print(simplify(sympify(expr_source)))
    except Exception as error:
        print("GEOMETRY_PARSE_ERROR: " + str(error))`;
  }

  if (problemType === "algebra") {
    return `import re
from sympy import symbols, Eq, solve, sympify, simplify, factor, sqrt
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
x, a, b, c, y, z = symbols('x a b c y z')
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt")
text = re.sub(r"(?i)^\\s*question\\s*\\d+\\s*[:.)-]*\\s*", "", text).strip()
text = text.replace("×", "*").replace("÷", "/")
text = re.sub(r"\\b([a-zA-Z])\\s*2\\b", r"\\1**2", text)
text = re.sub(r"\\b([a-zA-Z])\\s*3\\b", r"\\1**3", text)
text = re.sub(r"(?i)\\s*is\\s*$", "", text)
transformations = standard_transformations + (implicit_multiplication_application,)

assignments = re.findall(r"([a-zA-Z])\\s*=\\s*([^,;]+?)(?=(?:\\s+and\\s+[a-zA-Z]\\s*=|,|;|\\bfind\\b|\\bevaluate\\b|\\bcompute\\b|\\?|$))", text, flags=re.IGNORECASE)

def normalize_expr(expr):
    cleaned = expr.replace("^", "**").replace("−", "-").replace("√", "sqrt")
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*2\\b", r"\\1**2", cleaned)
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*3\\b", r"\\1**3", cleaned)
    cleaned = re.sub(r"sqrt\\s*\\*\\*\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"sqrt\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*sqrt\\s*\\(", r"\\1*sqrt(", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*([a-zA-Z])", r"\\1*\\2", cleaned)
    cleaned = re.sub(r"\\)\\s*\\(", r")*(", cleaned)
    cleaned = re.sub(r"(\\d)\\s*\\(", r"\\1*(", cleaned)
    cleaned = re.sub(r"\\)\\s*([a-zA-Z])", r")*\\1", cleaned)
    return cleaned

def safe_parse(val_str, local_dict):
    cleaned = normalize_expr(val_str)
    try:
        return parse_expr(cleaned, transformations=transformations, local_dict=local_dict)
    except Exception:
        try:
            return sympify(cleaned, locals=local_dict)
        except Exception:
            fallback = cleaned.replace(" ", "")
            return sympify(fallback, locals=local_dict)

local_values = {}
for var, value in assignments:
    local_values[var.lower()] = safe_parse(value.strip(), {**locals(), **local_values})

condition_match = re.search(r"(?i)if\\s+(.+?)\\s*,\\s*then", text)
condition_expr = condition_match.group(1).strip() if condition_match else None

expr_match = re.search(r"(?:value of|evaluate|compute|find)\\s+(.+?)(?:\\?|\\bis\\b|$)", text, flags=re.IGNORECASE)
target = (expr_match.group(1).strip() if expr_match else text).strip(" :")
target = target.replace("^", "**")

try:
    if condition_expr and "=" in condition_expr and target:
        left, right = condition_expr.split("=", 1)
        equation = Eq(safe_parse(left, {**locals(), **local_values}), safe_parse(right, {**locals(), **local_values}))
        expr = safe_parse(target, {**locals(), **local_values})
        free_vars = sorted(list(equation.free_symbols), key=lambda s: str(s))
        solved = None
        if free_vars:
            pivot = free_vars[-1]
            solved_list = solve(equation, pivot)
            if solved_list:
                solved = solved_list[0]
                expr = expr.subs(pivot, solved)
        print(simplify(expr))
    elif local_values and target:
        expr = safe_parse(target, {**locals(), **local_values})
        print(simplify(expr))
    elif "=" in target:
        left, right = target.split("=", 1)
        equation = Eq(safe_parse(left, locals()), safe_parse(right, locals()))
        print(solve(equation, x))
    else:
        expr = safe_parse(target, locals())
        print(factor(expr))
except Exception as error:
    print("ALGEBRA_PARSE_ERROR: " + str(error))`;
  }

  return `import re
from sympy import sympify, simplify, sqrt
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
raw = ${rawLiteral}
text = raw.replace("^", "**").replace("−", "-").replace("√", "sqrt").replace("²", "**2")
transformations = standard_transformations + (implicit_multiplication_application,)

def normalize_expr(expr):
    cleaned = expr.strip(" .:?")
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*2\\b", r"\\1**2", cleaned)
    cleaned = re.sub(r"\\b([a-zA-Z])\\s*3\\b", r"\\1**3", cleaned)
    cleaned = re.sub(r"(\\d+)\\s*([a-zA-Z])", r"\\1*\\2", cleaned)
    cleaned = re.sub(r"([a-zA-Z])([a-zA-Z])", r"\\1*\\2", cleaned)
    cleaned = re.sub(r"\\)\\s*\\(", r")*(", cleaned)
    cleaned = re.sub(r"(\\d)\\s*\\(", r"\\1*(", cleaned)
    cleaned = re.sub(r"\\)\\s*([a-zA-Z])", r")*\\1", cleaned)
    cleaned = re.sub(r"sqrt\\s*(\\d+)", r"sqrt(\\1)", cleaned)
    return cleaned

try:
    expr = parse_expr(normalize_expr(text), transformations=transformations, local_dict=locals())
    print(simplify(expr))
except Exception as error:
    try:
        expr = sympify(normalize_expr(text), locals=locals())
        print(simplify(expr))
    except Exception as inner_error:
        print("PARSE_ERROR: " + str(inner_error))`;
}
