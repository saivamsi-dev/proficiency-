import torch
import re
import logging
import time
from typing import Tuple, List, Optional, Any
from difflib import SequenceMatcher
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import os

try:
    from spellchecker import SpellChecker
    SPELLCHECKER_AVAILABLE = True
except ImportError:
    SPELLCHECKER_AVAILABLE = False
    logging.warning("pyspellchecker not installed. Spell correction disabled.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "bart_gec_model")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"GEC Service using device: {device}")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
model.to(device)
model.eval()

# Conservative generation parameters to minimize rewrites
GENERATION_CONFIG = {
    "max_length": 512,
    "num_beams": 5,
    "length_penalty": 0.9,  # Slight penalty to avoid expansion
    "early_stopping": True,
    "no_repeat_ngram_size": 3,
}

# Maximum iterations for correction
MAX_ITERATIONS = 3

# Edit distance threshold (30% of sentence length)
EDIT_DISTANCE_THRESHOLD = 0.30

# Batch size for processing multiple sentences
BATCH_SIZE = 8

# Instruction prompt for the model
# Note: Fine-tuned BART GEC models typically don't need instruction prompts
# They are trained to directly correct input text
# Using simple prefix or no prefix for compatibility
INSTRUCTION_PROMPT = ""  # Empty - send raw text to fine-tuned GEC model

# Legacy prompt prefix for backward compatibility
PROMPT_PREFIX = INSTRUCTION_PROMPT

# Protected phrases that should not be changed (temporal expressions, etc.)
PROTECTED_PHRASES = [
    "this morning", "this afternoon", "this evening", "tonight",
    "yesterday", "yesterday morning", "yesterday afternoon", "yesterday evening",
    "last night", "last week", "last month", "last year", "last time",
    "tomorrow", "tomorrow morning", "tomorrow afternoon", "tomorrow evening",
    "next week", "next month", "next year",
    "the day before yesterday", "the day after tomorrow",
    "a few days ago", "a week ago", "a month ago", "a year ago",
    "right now", "at the moment", "at present",
]


# ─── PREPROCESSING ───────────────────────────────────────────────────────────

def normalize_whitespace(text: str) -> str:
    """Normalize whitespace and remove duplicate spaces."""
    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)
    # Remove spaces before punctuation
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    # Add space after punctuation if missing (except for abbreviations)
    text = re.sub(r'([.,!?;:])([A-Za-z])', r'\1 \2', text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


def split_into_sentences(text: str) -> list:
    """Split text into sentences while preserving sentence boundaries."""
    # Handle common abbreviations to avoid false splits
    abbrevs = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Jr.', 'Sr.', 'Inc.', 'Ltd.', 'etc.', 'vs.', 'e.g.', 'i.e.']
    
    # Temporarily replace abbreviations
    protected_text = text
    placeholders = {}
    for i, abbrev in enumerate(abbrevs):
        placeholder = f"__ABBREV{i}__"
        placeholders[placeholder] = abbrev
        protected_text = protected_text.replace(abbrev, placeholder)
    
    # Split on sentence boundaries
    sentence_pattern = r'(?<=[.!?])\s+'
    sentences = re.split(sentence_pattern, protected_text)
    
    # Restore abbreviations
    restored_sentences = []
    for sent in sentences:
        for placeholder, abbrev in placeholders.items():
            sent = sent.replace(placeholder, abbrev)
        sent = sent.strip()
        if sent:
            restored_sentences.append(sent)
    
    return restored_sentences if restored_sentences else [text]


# ─── SPELL CORRECTION PREPROCESSING ──────────────────────────────────────────

# Common irregular verb corrections
IRREGULAR_VERB_CORRECTIONS = {
    "waked": "woke",
    "writed": "wrote",
    "goed": "went",
    "runned": "ran",
    "swimmed": "swam",
    "drived": "drove",
    "eated": "ate",
    "seed": "saw",
    "taked": "took",
    "bringed": "brought",
    "buyed": "bought",
    "catched": "caught",
    "teached": "taught",
    "thinked": "thought",
    "finded": "found",
    "keeped": "kept",
    "leaved": "left",
    "meeted": "met",
    "payed": "paid",
    "sayed": "said",
    "selled": "sold",
    "sended": "sent",
    "sitted": "sat",
    "sleeped": "slept",
    "speaked": "spoke",
    "spended": "spent",
    "standed": "stood",
    "understanded": "understood",
    "begined": "began",
    "breaked": "broke",
    "choosed": "chose",
    "comed": "came",
    "drinked": "drank",
    "feeled": "felt",
    "flied": "flew",
    "forgeted": "forgot",
    "gived": "gave",
    "growed": "grew",
    "heared": "heard",
    "hided": "hid",
    "knowed": "knew",
    "losed": "lost",
    "maked": "made",
    "readed": "read",
    "rided": "rode",
    "ringed": "rang",
    "rised": "rose",
    "singed": "sang",
    "speaked": "spoke",
    "stealed": "stole",
    "telled": "told",
    "throwed": "threw",
    "weared": "wore",
    "winned": "won",
    "writed": "wrote",
}

# Common misspellings
COMMON_MISSPELLINGS = {
    "collage": "college",
    "definately": "definitely",
    "seperate": "separate",
    "occured": "occurred",
    "recieve": "receive",
    "untill": "until",
    "begining": "beginning",
    "beleive": "believe",
    "calender": "calendar",
    "collegue": "colleague",
    "commitee": "committee",
    "concious": "conscious",
    "enviroment": "environment",
    "existance": "existence",
    "foriegn": "foreign",
    "goverment": "government",
    "grammer": "grammar",
    "happend": "happened",
    "independant": "independent",
    "knowlege": "knowledge",
    "liason": "liaison",
    "libary": "library",
    "mispell": "misspell",
    "neccessary": "necessary",
    "noticable": "noticeable",
    "occurence": "occurrence",
    "persue": "pursue",
    "posession": "possession",
    "recomend": "recommend",
    "refered": "referred",
    "relevent": "relevant",
    "rythm": "rhythm",
    "similiar": "similar",
    "succesful": "successful",
    "suprise": "surprise",
    "thier": "their",
    "tommorow": "tomorrow",
    "truely": "truly",
    "wierd": "weird",
    "accomodate": "accommodate",
    "acheive": "achieve",
    "aquire": "acquire",
    "arguement": "argument",
    "assasination": "assassination",
    "basicly": "basically",
    "becuase": "because",
    "buisness": "business",
    "catagory": "category",
    "cemetary": "cemetery",
    "changable": "changeable",
    "completly": "completely",
    "concensus": "consensus",
    "curiousity": "curiosity",
    "dissapear": "disappear",
    "dissapoint": "disappoint",
    "embarass": "embarrass",
    "equiptment": "equipment",
    "excercise": "exercise",
    "facinating": "fascinating",
    "firey": "fiery",
    "fourty": "forty",
    "freind": "friend",
    "gaurd": "guard",
    "glamourous": "glamorous",
    "guidence": "guidance",
    "harrass": "harass",
    "heighth": "height",
    "heros": "heroes",
    "humourous": "humorous",
    "hygene": "hygiene",
    "immediatly": "immediately",
    "incidently": "incidentally",
    "independance": "independence",
    "innoculate": "inoculate",
    "intelligance": "intelligence",
    "intresting": "interesting",
    "irresistable": "irresistible",
    "jewellery": "jewelry",
    "judgement": "judgment",
    "maintainance": "maintenance",
    "millenium": "millennium",
    "minature": "miniature",
    "mischievious": "mischievous",
    "mispell": "misspell",
    "naturaly": "naturally",
    "neice": "niece",
    "ninty": "ninety",
    "occassion": "occasion",
    "occurrance": "occurrence",
    "paralell": "parallel",
    "peice": "piece",
    "perseverence": "perseverance",
    "pharoah": "pharaoh",
    "plagarism": "plagiarism",
    "pratical": "practical",
    "preceeding": "preceding",
    "privledge": "privilege",
    "probly": "probably",
    "pronounciation": "pronunciation",
    "publically": "publicly",
    "que": "queue",
    "questionaire": "questionnaire",
    "realy": "really",
    "reccomend": "recommend",
    "rediculous": "ridiculous",
    "refference": "reference",
    "religous": "religious",
    "repitition": "repetition",
    "resistence": "resistance",
    "responsability": "responsibility",
    "restauraunt": "restaurant",
    "sacrafice": "sacrifice",
    "sargent": "sergeant",
    "sence": "sense",
    "sieze": "seize",
    "speach": "speech",
    "strenght": "strength",
    "succede": "succeed",
    "supprise": "surprise",
    "symetrical": "symmetrical",
    "temperture": "temperature",
    "tendancy": "tendency",
    "tge": "the",
    "thats": "that's",
    "theif": "thief",
    "theres": "there's",
    "thorough": "thorough",
    "tounge": "tongue",
    "trully": "truly",
    "underate": "underrate",
    "unforseen": "unforeseen",
    "unfortunatly": "unfortunately",
    "unneccessary": "unnecessary",
    "vaccuum": "vacuum",
    "vegatable": "vegetable",
    "visious": "vicious",
    "wensday": "Wednesday",
    "whereever": "wherever",
    "wich": "which",
    "writting": "writing",
}

# Initialize spell checker
_spell_checker: Optional[Any] = None


def _get_spell_checker() -> Optional[Any]:
    """Get or initialize the spell checker instance."""
    global _spell_checker
    if not SPELLCHECKER_AVAILABLE:
        return None
    if _spell_checker is None:
        _spell_checker = SpellChecker()
        # Add common words that might be flagged incorrectly
        custom_words = [
            "gonna", "wanna", "gotta", "kinda", "sorta",
            "ok", "okay", "yeah", "yep", "nope", "email", "online",
        ]
        _spell_checker.word_frequency.load_words(custom_words)
    return _spell_checker


def apply_spell_correction(sentence: str) -> str:
    """
    Apply lightweight spelling correction before grammar model.
    
    Args:
        sentence: Input sentence
        
    Returns:
        Sentence with spelling corrections applied
    """
    all_corrections = {**IRREGULAR_VERB_CORRECTIONS, **COMMON_MISSPELLINGS}
    
    words = sentence.split()
    corrected_words = []
    
    for word in words:
        # Preserve punctuation
        prefix = ""
        suffix = ""
        core_word = word
        
        # Extract leading punctuation
        while core_word and not core_word[0].isalnum():
            prefix += core_word[0]
            core_word = core_word[1:]
        
        # Extract trailing punctuation
        while core_word and not core_word[-1].isalnum():
            suffix = core_word[-1] + suffix
            core_word = core_word[:-1]
        
        if not core_word:
            corrected_words.append(word)
            continue
        
        lower_word = core_word.lower()
        
        # Check our custom corrections first
        if lower_word in all_corrections:
            correction = all_corrections[lower_word]
            # Preserve original case
            if core_word.isupper():
                correction = correction.upper()
            elif core_word[0].isupper():
                correction = correction.capitalize()
            corrected_words.append(prefix + correction + suffix)
        else:
            # Use spellchecker for other words (if available)
            spell_checker = _get_spell_checker()
            if spell_checker and lower_word not in spell_checker and len(core_word) > 2:
                candidates = spell_checker.candidates(lower_word)
                if candidates:
                    correction = spell_checker.correction(lower_word)
                    if correction and correction != lower_word:
                        # Preserve original case
                        if core_word.isupper():
                            correction = correction.upper()
                        elif core_word[0].isupper():
                            correction = correction.capitalize()
                        corrected_words.append(prefix + correction + suffix)
                        continue
            
            corrected_words.append(word)
    
    return " ".join(corrected_words)


# ─── EDIT DISTANCE AND CONFIDENCE ────────────────────────────────────────────

def calculate_edit_distance(s1: str, s2: str) -> float:
    """
    Calculate normalized edit distance between two strings.
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        Normalized edit distance (0 to 1, where 0 = identical)
    """
    if not s1 and not s2:
        return 0.0
    
    matcher = SequenceMatcher(None, s1.lower(), s2.lower())
    similarity = matcher.ratio()
    return 1.0 - similarity


def confidence_filter(original: str, corrected: str) -> Tuple[bool, float]:
    """
    Filter corrections based on edit distance threshold.
    Rejects corrections that change too much of the original.
    
    Args:
        original: Original sentence
        corrected: Corrected sentence
        
    Returns:
        Tuple of (accepted, edit_distance)
    """
    edit_distance = calculate_edit_distance(original, corrected)
    
    # Reject if edit distance exceeds threshold (30%)
    accepted = edit_distance <= EDIT_DISTANCE_THRESHOLD
    
    return accepted, edit_distance


# ─── PHRASE PRESERVATION ─────────────────────────────────────────────────────

def protect_phrases(text: str) -> tuple:
    """
    Protect phrases that should not be changed by the model.
    Returns (protected_text, placeholders_dict).
    """
    placeholders = {}
    protected_text = text
    
    # Sort by length descending to avoid partial replacements
    sorted_phrases = sorted(PROTECTED_PHRASES, key=len, reverse=True)
    
    for i, phrase in enumerate(sorted_phrases):
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        matches = pattern.findall(protected_text)
        for match in matches:
            placeholder = f"__PROTECTED_{i}_{len(placeholders)}__"
            placeholders[placeholder] = match  # Preserve original case
            protected_text = protected_text.replace(match, placeholder, 1)
    
    return protected_text, placeholders


def restore_phrases(text: str, placeholders: dict) -> str:
    """Restore protected phrases from placeholders."""
    for placeholder, original in placeholders.items():
        text = text.replace(placeholder, original)
    return text


# ─── POSTPROCESSING ──────────────────────────────────────────────────────────

def postprocess_text(text: str) -> str:
    """Clean up the corrected text with validation."""
    # Fix spacing around punctuation
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    text = re.sub(r'([.,!?;:])([A-Za-z])', r'\1 \2', text)
    
    # Remove duplicate spaces
    text = re.sub(r' +', ' ', text)
    
    # Ensure sentences start with capital letters
    def capitalize_sentence_start(match):
        return match.group(1) + match.group(2).upper()
    
    text = re.sub(r'(^|[.!?]\s+)([a-z])', capitalize_sentence_start, text)
    
    # Capitalize first character if not already
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    
    # Fix common spacing issues
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'"\s+', '"', text)
    text = re.sub(r'\s+"', '"', text)
    
    # Fix spacing around apostrophes
    text = re.sub(r"\s+'\s*", "'", text)
    text = re.sub(r"\s+'", "'", text)
    
    # Fix contractions spacing
    text = re.sub(r"(\w)\s+n't", r"\1n't", text)
    text = re.sub(r"(\w)\s+'(s|re|ve|ll|d)\b", r"\1'\2", text)
    
    # Remove dangling articles/determiners/prepositions at end of sentence
    # These often occur when model truncates or produces incomplete output
    dangling_words = ['the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'but']
    words = text.split()
    while words and words[-1].lower().rstrip('.,!?;:') in dangling_words:
        # Check if it's just the dangling word (possibly with punctuation)
        last_word = words[-1].rstrip('.,!?;:')
        if last_word.lower() in dangling_words:
            words.pop()
        else:
            break
    text = ' '.join(words)
    
    # Ensure sentence ends with proper punctuation
    if text and text[-1] not in '.!?':
        text += '.'
    
    return text.strip()


# ─── PARAGRAPH-LEVEL IMPROVEMENTS ────────────────────────────────────────────

# Past time markers that indicate verbs should be in past tense
PAST_TIME_MARKERS = [
    "this morning", "this afternoon", "this evening",
    "yesterday", "yesterday morning", "yesterday afternoon", "yesterday evening",
    "last night", "last week", "last month", "last year", "last time",
    "earlier today", "earlier this week", "earlier this month",
    "the day before yesterday",
    "a few days ago", "a week ago", "a month ago", "a year ago",
    "two days ago", "three days ago", "several days ago",
    "in the past", "back then", "at that time",
]

# Present to past tense verb mapping for common verbs
PRESENT_TO_PAST_VERBS = {
    # Irregular verbs
    "meet": "met",
    "drink": "drank",
    "eat": "ate",
    "go": "went",
    "come": "came",
    "see": "saw",
    "hear": "heard",
    "say": "said",
    "tell": "told",
    "give": "gave",
    "take": "took",
    "make": "made",
    "get": "got",
    "know": "knew",
    "think": "thought",
    "find": "found",
    "leave": "left",
    "feel": "felt",
    "become": "became",
    "begin": "began",
    "bring": "brought",
    "buy": "bought",
    "catch": "caught",
    "choose": "chose",
    "do": "did",
    "draw": "drew",
    "drive": "drove",
    "fall": "fell",
    "fly": "flew",
    "forget": "forgot",
    "grow": "grew",
    "have": "had",
    "hide": "hid",
    "hold": "held",
    "keep": "kept",
    "lead": "led",
    "let": "let",
    "lose": "lost",
    "pay": "paid",
    "put": "put",
    "read": "read",
    "ride": "rode",
    "ring": "rang",
    "rise": "rose",
    "run": "ran",
    "sell": "sold",
    "send": "sent",
    "set": "set",
    "shake": "shook",
    "show": "showed",
    "shut": "shut",
    "sing": "sang",
    "sit": "sat",
    "sleep": "slept",
    "speak": "spoke",
    "spend": "spent",
    "stand": "stood",
    "steal": "stole",
    "swim": "swam",
    "teach": "taught",
    "throw": "threw",
    "understand": "understood",
    "wake": "woke",
    "wear": "wore",
    "win": "won",
    "write": "wrote",
    # Regular verbs (add -ed or -d)
    "talk": "talked",
    "walk": "walked",
    "return": "returned",
    "watch": "watched",
    "play": "played",
    "work": "worked",
    "finish": "finished",
    "start": "started",
    "call": "called",
    "ask": "asked",
    "help": "helped",
    "look": "looked",
    "want": "wanted",
    "need": "needed",
    "like": "liked",
    "love": "loved",
    "hate": "hated",
    "live": "lived",
    "move": "moved",
    "stay": "stayed",
    "wait": "waited",
    "turn": "turned",
    "open": "opened",
    "close": "closed",
    "stop": "stopped",
    "listen": "listened",
    "visit": "visited",
    "enjoy": "enjoyed",
    "decide": "decided",
    "arrive": "arrived",
    "learn": "learned",
    "study": "studied",
    "try": "tried",
    "use": "used",
    "change": "changed",
    "happen": "happened",
    "order": "ordered",
    "cook": "cooked",
    "clean": "cleaned",
    "wash": "washed",
    "share": "shared",
}

# Natural phrase normalizations
PHRASE_NORMALIZATIONS = [
    # (pattern, replacement)
    (r'\bfor walking\b', 'for a walk'),
    (r'\bfor jogging\b', 'for a jog'),
    (r'\bfor running\b', 'for a run'),
    (r'\bfor swimming\b', 'for a swim'),
    (r'\bdoing exercises\b', 'exercising'),
    (r'\bdoing exercise\b', 'exercising'),
    (r'\bspending one hour\b', 'spending an hour'),
    (r'\bspending 1 hour\b', 'spending an hour'),
    (r'\bafter one hour\b', 'after an hour'),
    (r'\bafter 1 hour\b', 'after an hour'),
    (r'\bfor one hour\b', 'for an hour'),
    (r'\bfor 1 hour\b', 'for an hour'),
    (r'\bwent to home\b', 'went home'),
    (r'\breturn to home\b', 'return home'),
    (r'\breturned to home\b', 'returned home'),
    (r'\bback to home\b', 'back home'),
    (r'\bgo to home\b', 'go home'),
    (r'\bcame to home\b', 'came home'),
    (r'\bcome to home\b', 'come home'),
    (r'\bin the morning time\b', 'in the morning'),
    (r'\bin the evening time\b', 'in the evening'),
    (r'\bin the night time\b', 'at night'),
    (r'\bat the night\b', 'at night'),
    (r'\bin the night\b', 'at night'),
    (r'\bmany peoples\b', 'many people'),
    (r'\bmuch peoples\b', 'many people'),
    (r'\blot of peoples\b', 'lot of people'),
    (r'\bmore better\b', 'better'),
    (r'\bmore worse\b', 'worse'),
    (r'\bvery much good\b', 'very good'),
    (r'\bvery much bad\b', 'very bad'),
]


def detect_past_context(text: str) -> bool:
    """
    Detect if the text contains past time markers indicating past tense should be used.
    
    Args:
        text: Input text (sentence or paragraph)
        
    Returns:
        True if past time context is detected
    """
    text_lower = text.lower()
    for marker in PAST_TIME_MARKERS:
        if marker in text_lower:
            return True
    return False


def correct_verb_tense(sentence: str, force_past: bool = False) -> str:
    """
    Correct verb tense consistency within a sentence.
    If past time markers are detected or force_past is True,
    convert present tense verbs to past tense.
    
    Args:
        sentence: Input sentence
        force_past: Force past tense correction
        
    Returns:
        Sentence with corrected verb tenses
    """
    # Check if this sentence has past context
    has_past_context = force_past or detect_past_context(sentence)
    
    if not has_past_context:
        return sentence
    
    words = sentence.split()
    corrected_words = []
    
    # Track if we've seen a subject pronoun (I, we, he, she, they, etc.)
    subject_pronouns = {'i', 'we', 'he', 'she', 'they', 'it', 'you'}
    
    for i, word in enumerate(words):
        # Preserve punctuation
        prefix = ""
        suffix = ""
        core_word = word
        
        while core_word and not core_word[0].isalnum():
            prefix += core_word[0]
            core_word = core_word[1:]
        
        while core_word and not core_word[-1].isalnum():
            suffix = core_word[-1] + suffix
            core_word = core_word[:-1]
        
        if not core_word:
            corrected_words.append(word)
            continue
        
        lower_word = core_word.lower()
        
        # Check if this word is a present tense verb that should be past
        if lower_word in PRESENT_TO_PAST_VERBS:
            # Check context: look for subject before this verb
            # Simple heuristic: if previous word is a pronoun or noun-like, convert
            if i > 0:
                prev_word = words[i-1].lower().rstrip('.,!?;:')
                # Also check for "and" patterns like "and we talk" -> "and we talked"
                if prev_word in subject_pronouns or prev_word == 'and' or (i > 1 and words[i-2].lower().rstrip('.,!?;:') in subject_pronouns):
                    past_form = PRESENT_TO_PAST_VERBS[lower_word]
                    # Preserve original case
                    if core_word[0].isupper():
                        past_form = past_form.capitalize()
                    corrected_words.append(prefix + past_form + suffix)
                    continue
        
        corrected_words.append(word)
    
    return ' '.join(corrected_words)


def normalize_phrases(text: str) -> str:
    """
    Normalize unnatural phrases to more natural English expressions.
    
    Args:
        text: Input text
        
    Returns:
        Text with normalized phrases
    """
    for pattern, replacement in PHRASE_NORMALIZATIONS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    return text


def recover_sentence_boundaries(text: str) -> str:
    """
    Detect and fix missing punctuation between sentences.
    Inserts a period before a capitalized word when the previous
    token sequence forms a complete clause.
    
    This is conservative - only inserts periods when confident
    there's a missing sentence boundary.
    
    Args:
        text: Input text
        
    Returns:
        Text with recovered sentence boundaries
    """
    # Words that strongly indicate a new sentence is starting when capitalized
    # and appear after what looks like a complete clause
    strong_sentence_starters = [
        'After', 'Before', 'When', 'While', 'Although', 'Because', 'Since',
        'However', 'Therefore', 'Moreover', 'Furthermore', 'Meanwhile',
        'Then', 'Later', 'Finally', 'Suddenly', 'Eventually',
    ]
    
    # Words that could continue a sentence and should NOT trigger boundary insertion
    continuation_contexts = [
        'this', 'that', 'the', 'a', 'an', 'my', 'his', 'her', 'our', 'their', 'your',
        'i', 'we', 'he', 'she', 'it', 'they', 'you',
    ]
    
    # Words that indicate the previous clause is likely complete
    clause_ending_words = [
        'things', 'time', 'day', 'night', 'home', 'there', 'here', 'it', 'them',
        'us', 'me', 'him', 'her', 'much', 'long', 'well', 'fast', 'hard',
        'together', 'alone', 'quickly', 'slowly', 'finally', 'ago',
    ]
    
    words = text.split()
    if len(words) < 5:  # Need at least a few words for sentence boundary detection
        return text
    
    result_words = [words[0]]
    words_since_last_punct = 1
    
    for i in range(1, len(words)):
        current_word = words[i]
        prev_word = words[i-1]
        current_word_clean = current_word.rstrip('.,!?;:')
        prev_word_clean = prev_word.lower().rstrip('.,!?;:')
        
        # Reset counter if we hit punctuation
        if prev_word and prev_word[-1] in '.!?':
            words_since_last_punct = 0
        
        # Check if current word is a strong sentence starter and capitalized
        if (current_word and current_word[0].isupper() and 
            current_word_clean in strong_sentence_starters):
            
            # Check if previous word doesn't end with punctuation
            if prev_word and prev_word[-1] not in '.!?':
                
                # Only insert if:
                # 1. We have enough words since last punctuation (at least 4 words = likely complete clause)
                # 2. Previous word looks like it could end a clause
                should_insert = (
                    words_since_last_punct >= 4 and
                    prev_word_clean in clause_ending_words
                )
                
                if should_insert:
                    # Insert period before this word
                    result_words[-1] = result_words[-1].rstrip(',;:') + '.'
                    logger.debug(f"Recovered sentence boundary before '{current_word}'")
        
        result_words.append(current_word)
        words_since_last_punct += 1
    
    return ' '.join(result_words)


def apply_paragraph_corrections(text: str) -> str:
    """
    Apply all paragraph-level corrections:
    1. Sentence boundary recovery
    2. Verb tense consistency
    3. Phrase normalization
    
    Args:
        text: Input paragraph
        
    Returns:
        Corrected paragraph
    """
    # Step 1: Recover sentence boundaries first
    text = recover_sentence_boundaries(text)
    
    # Step 2: Detect overall past context for the paragraph
    has_past_context = detect_past_context(text)
    
    # Step 3: Split into sentences and apply corrections to each
    sentences = split_into_sentences(text)
    corrected_sentences = []
    
    for sentence in sentences:
        # Apply verb tense correction (propagate past context from paragraph)
        corrected = correct_verb_tense(sentence, force_past=has_past_context)
        
        # Apply phrase normalization
        corrected = normalize_phrases(corrected)
        
        corrected_sentences.append(corrected)
    
    # Step 4: Rejoin sentences
    result = ' '.join(corrected_sentences)
    
    return result


# ─── RULE-BASED CORRECTIONS ──────────────────────────────────────────────────

def fix_compound_subject_pronouns(text: str) -> str:
    """Fix compound subject pronoun errors like 'Me and him went'."""
    pronoun_map = {
        "me": "I",
        "him": "he",
        "her": "she",
        "us": "we",
        "them": "they",
    }
    pattern = r"^(me|him|her|us|them)\s+and\s+(me|him|her|us|them|[A-Za-z]+)"
    match = re.match(pattern, text, re.IGNORECASE)

    if match:
        first = match.group(1).lower()
        second = match.group(2)
        first_corrected = pronoun_map.get(first, first)
        second_corrected = pronoun_map.get(second.lower(), second)
        corrected_phrase = f"{second_corrected} and {first_corrected}"
        text = re.sub(pattern, corrected_phrase, text, flags=re.IGNORECASE)

    return text


def apply_rule_based_corrections(text: str) -> str:
    """Apply all rule-based corrections."""
    text = fix_compound_subject_pronouns(text)
    
    # Fix bare "be" after pronouns (common model error)
    # "he be here" → "he was here" (if past context) or "he is here"
    text = re.sub(r'\b(yesterday|last\s+\w+)[,\s]+(\w+)\s+be\b', r'\1, \2 was', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(he|she|it)\s+be\b', r'\1 is', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(they|we|you)\s+be\b', r'\1 are', text, flags=re.IGNORECASE)
    text = re.sub(r'\bI\s+be\b', 'I am', text)
    
    # Fix common tense inconsistencies with time markers
    tense_patterns = [
        # Past time markers with future/present tense
        (r'\b(yesterday|last\s+(?:week|month|year|night|time))\b([^.!?]*)\b(will|is going to)\b', 
         lambda m: m.group(1) + m.group(2).replace('will', 'would').replace('is going to', 'was going to')),
        # Future time markers with past tense
        (r'\b(tomorrow|next\s+(?:week|month|year))\b([^.!?]*)\b(went|was|did)\b',
         lambda m: m.group(1) + m.group(2).replace('went', 'will go').replace('was', 'will be').replace('did', 'will do')),
    ]
    
    for pattern, replacement in tense_patterns:
        if callable(replacement):
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        else:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Fix subject-verb agreement for common cases
    text = re.sub(r'\b(he|she|it)\s+(are|were)\b', r'\1 is', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(they|we|you)\s+(is|was)\b', r'\1 are', text, flags=re.IGNORECASE)
    
    # Fix "I goes/he go" subject-verb agreement
    text = re.sub(r'\bI\s+goes\b', 'I go', text)
    text = re.sub(r'\b(he|she|it)\s+go\b(?!\s+to\s+\w)', r'\1 goes', text, flags=re.IGNORECASE)
    
    # Fix double negatives
    text = re.sub(r"\bdon't\s+got\s+no\b", "don't have any", text, flags=re.IGNORECASE)
    text = re.sub(r"\bain't\s+got\s+no\b", "don't have any", text, flags=re.IGNORECASE)
    
    return text


# ─── MODEL INFERENCE ─────────────────────────────────────────────────────────

def _single_model_pass(sentence: str, use_prompt: bool = True) -> str:
    """
    Run a single correction pass through the BART model.
    This is a low-level function used by iterative correction.
    
    Args:
        sentence: Input sentence (may already be protected)
        use_prompt: Whether to add instruction prompt
        
    Returns:
        Corrected sentence from model
    """
    input_text = f"{PROMPT_PREFIX}{sentence}" if use_prompt else sentence
    
    inputs = tokenizer(
        input_text, 
        return_tensors="pt", 
        truncation=True,
        max_length=512,
        padding=True
    ).to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            **GENERATION_CONFIG,
        )
    
    corrected = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Remove prompt prefix from output if model echoed it
    corrected_lower = corrected.lower()
    prompt_lower = PROMPT_PREFIX.lower().strip()
    
    if corrected_lower.startswith(prompt_lower):
        corrected = corrected[len(PROMPT_PREFIX):]
    elif "correct spelling" in corrected_lower or "fix grammar" in corrected_lower:
        # Handle partial echo - find first colon and take text after
        idx = corrected_lower.find(":")
        if idx != -1 and idx < 100:
            # Find "Sentence:" specifically
            sentence_idx = corrected_lower.find("sentence:")
            if sentence_idx != -1:
                corrected = corrected[sentence_idx + 9:]
            else:
                corrected = corrected[idx + 1:]
    
    return corrected.strip()


def iterative_correction(sentence: str, use_prompt: bool = True) -> Tuple[str, int]:
    """
    Apply correction iteratively up to MAX_ITERATIONS times.
    Stops early if the output does not change.
    
    Args:
        sentence: Input sentence
        use_prompt: Whether to use instruction prompt
        
    Returns:
        Tuple of (corrected sentence, number of iterations)
    """
    current = sentence
    iterations = 0
    
    for i in range(MAX_ITERATIONS):
        iterations = i + 1
        
        # Generate correction
        corrected = _single_model_pass(current, use_prompt)
        
        # Early stopping if no change
        if corrected.strip() == current.strip():
            break
        
        current = corrected
    
    return current, iterations


def correct_single_sentence(sentence: str, use_prompt: bool = True) -> Tuple[str, int, float, bool]:
    """
    Correct a single sentence using the BART model with full pipeline.
    Includes spell correction, iterative correction, and confidence filtering.
    
    Args:
        sentence: Input sentence
        use_prompt: Whether to use instruction prompt
        
    Returns:
        Tuple of (corrected_sentence, iterations, edit_distance, accepted)
    """
    if not sentence.strip():
        return sentence, 0, 0.0, True
    
    original_sentence = sentence
    
    # Step 1: Apply spell correction preprocessing
    spell_corrected = apply_spell_correction(sentence)
    
    # Step 2: Protect phrases before correction
    protected_sentence, placeholders = protect_phrases(spell_corrected)
    
    # Step 3: Iterative BART correction
    corrected, iterations = iterative_correction(protected_sentence, use_prompt)
    
    # Step 4: Restore protected phrases
    corrected = restore_phrases(corrected, placeholders)
    
    # Debug: log what BART actually output
    logger.debug(f"BART input: {protected_sentence}")
    logger.debug(f"BART output: {corrected}")
    
    # Step 5: Confidence filtering - compare spell-corrected input to BART output
    # This checks if BART made too many changes from what we gave it
    accepted, edit_distance = confidence_filter(spell_corrected, corrected)
    
    if not accepted:
        # Reject BART correction, keep only spell corrections
        corrected = spell_corrected
        logger.info(
            f"Correction rejected (edit_distance={edit_distance:.2%} > {EDIT_DISTANCE_THRESHOLD:.0%})"
        )
    
    # Step 6: Post-process
    corrected = postprocess_text(corrected)
    
    return corrected, iterations, edit_distance, accepted


def correct_batch(sentences: list, use_prompt: bool = True) -> List[Tuple[str, int, float, bool]]:
    """
    Correct multiple sentences in a batch with full pipeline.
    
    Args:
        sentences: List of input sentences
        use_prompt: Whether to use instruction prompt
        
    Returns:
        List of tuples (corrected_sentence, iterations, edit_distance, accepted)
    """
    if not sentences:
        return []
    
    results = []
    for sentence in sentences:
        result = correct_single_sentence(sentence, use_prompt)
        results.append(result)
    
    return results


# ─── MAIN CORRECTION FUNCTION ────────────────────────────────────────────────

def log_sentence_correction(
    original: str,
    corrected: str,
    iterations: int,
    edit_distance: float,
    accepted: bool
):
    """
    Log detailed correction information for each sentence.
    
    Args:
        original: Original sentence
        corrected: Corrected sentence
        iterations: Number of correction iterations
        edit_distance: Calculated edit distance
        accepted: Whether correction was accepted
    """
    logger.info(
        f"\n{'='*60}\n"
        f"GRAMMAR CORRECTION LOG\n"
        f"{'='*60}\n"
        f"Original:     {original}\n"
        f"Corrected:    {corrected}\n"
        f"Iterations:   {iterations}\n"
        f"Edit Dist:    {edit_distance:.2%}\n"
        f"Accepted:     {accepted}\n"
        f"{'='*60}"
    )


def correct_text(text: str) -> str:
    """
    Main grammar correction function with enhanced pipeline.
    
    Pipeline:
    1. User text
    2. Normalize whitespace
    3. Sentence boundary recovery
    4. Sentence tokenizer
    5. Spell correction (per sentence)
    6. Verb tense normalization
    7. Iterative BART correction (up to 3 passes)
    8. Phrase normalization  
    9. Confidence filtering
    10. Phrase protection
    11. Merge sentences
    12. Final postprocessing
    13. Return corrected text
    
    Args:
        text: Input text to correct
        
    Returns:
        Corrected text
    """
    start_time = time.time()
    original_text = text
    
    # Step 1: Preprocessing - normalize whitespace
    text = normalize_whitespace(text)
    
    # Step 2: Recover sentence boundaries (detect missing periods)
    text = recover_sentence_boundaries(text)
    
    # Step 3: Apply initial rule-based corrections
    text = apply_rule_based_corrections(text)
    
    # Step 4: Detect paragraph-level past context
    has_past_context = detect_past_context(text)
    
    # Step 5: Split into sentences for better accuracy
    sentences = split_into_sentences(text)
    logger.debug(f"Split into {len(sentences)} sentences")
    
    # Step 6: Correct each sentence through full pipeline
    corrected_sentences = []
    sentence_logs = []
    total_iterations = 0
    accepted_count = 0
    rejected_count = 0
    
    for sentence in sentences:
        if not sentence.strip():
            corrected_sentences.append(sentence)
            continue
        
        try:
            # Step 6a: Full pipeline: spell correction -> iterative BART -> confidence filter
            corrected, iterations, edit_distance, accepted = correct_single_sentence(sentence)
            
            # Step 6b: Apply verb tense correction using paragraph context
            corrected = correct_verb_tense(corrected, force_past=has_past_context)
            
            # Step 6c: Apply phrase normalization
            corrected = normalize_phrases(corrected)
            
            total_iterations += iterations
            if accepted:
                accepted_count += 1
            else:
                rejected_count += 1
            
            # Log each sentence correction
            log_sentence_correction(
                original=sentence,
                corrected=corrected,
                iterations=iterations,
                edit_distance=edit_distance,
                accepted=accepted
            )
            
            sentence_logs.append({
                "original": sentence,
                "corrected": corrected,
                "iterations": iterations,
                "edit_distance": edit_distance,
                "accepted": accepted,
                "edited": sentence.strip() != corrected.strip()
            })
            
            corrected_sentences.append(corrected)
            
        except Exception as e:
            logger.error(f"Error correcting sentence: {e}")
            corrected_sentences.append(sentence)
            sentence_logs.append({
                "original": sentence,
                "corrected": sentence,
                "iterations": 0,
                "edit_distance": 0.0,
                "accepted": False,
                "edited": False,
                "error": str(e)
            })
    
    # Step 5: Merge sentences back
    corrected_text = ' '.join(corrected_sentences)
    
    # Step 6: Final postprocessing - validate and clean
    corrected_text = postprocess_text(corrected_text)
    
    # Step 7: Final rule-based pass for any remaining issues
    corrected_text = apply_rule_based_corrections(corrected_text)
    
    # Calculate statistics
    elapsed_time = time.time() - start_time
    edits_made = sum(1 for log in sentence_logs if log.get("edited", False))
    total_sentences = len(sentences)
    avg_iterations = total_iterations / max(len(sentences), 1)
    
    # Comprehensive summary logging
    logger.info(
        f"\n{'='*60}\n"
        f"GEC SUMMARY\n"
        f"{'='*60}\n"
        f"Time:         {elapsed_time:.3f}s\n"
        f"Sentences:    {total_sentences}\n"
        f"Edits Made:   {edits_made}\n"
        f"Accepted:     {accepted_count}\n"
        f"Rejected:     {rejected_count}\n"
        f"Avg Iters:    {avg_iterations:.1f}\n"
        f"{'='*60}"
    )
    
    if original_text.strip() != corrected_text.strip():
        logger.debug(f"INPUT:  {original_text[:150]}{'...' if len(original_text) > 150 else ''}")
        logger.debug(f"OUTPUT: {corrected_text[:150]}{'...' if len(corrected_text) > 150 else ''}")
    else:
        logger.debug("No changes made - text was already correct")
    
    return corrected_text


def calculate_grammar_accuracy(original: str, corrected: str) -> float:
    """Calculate grammar accuracy based on word changes."""
    original_words = original.split()
    corrected_words = corrected.split()

    if len(original_words) == 0:
        return 100.0

    changes = sum(
        1 for o, c in zip(original_words, corrected_words)
        if o != c
    )

    error_ratio = changes / len(original_words)
    accuracy = (1 - error_ratio) * 100

    if accuracy < 0:
        accuracy = 0.0

    return round(accuracy, 2)