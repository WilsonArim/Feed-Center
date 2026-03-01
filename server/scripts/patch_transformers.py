#!/usr/bin/env python3
"""
Runtime patches for `transformers` to load Qwen3-VL on MLX
without torchvision/PyTorch.

MUST be imported BEFORE mlx_vlm:
    import patch_transformers  # noqa: F401
    from mlx_vlm import load, generate

The core issue: transformers 5.x tries to load a VideoProcessor for
Qwen3-VL which requires torchvision. On MLX we only need the slow
image processor and tokenizer.
"""

import logging

logger = logging.getLogger(__name__)

_PATCHED = False


def apply():
    global _PATCHED
    if _PATCHED:
        return
    _PATCHED = True

    from transformers import processing_utils
    from transformers.processing_utils import (
        _get_modality_for_attribute,
        MODALITY_TO_AUTOPROCESSOR_MAPPING,
    )

    # ── Patch 1: check_argument_for_proper_class → allow None ──
    _original_check = processing_utils.ProcessorMixin.check_argument_for_proper_class

    def _safe_check(self, argument_name, argument):
        if argument is None:
            return None
        return _original_check(self, argument_name, argument)

    processing_utils.ProcessorMixin.check_argument_for_proper_class = _safe_check

    # ── Patch 2: _get_arguments_from_pretrained → graceful fallback ──
    @classmethod
    def _safe_get_args(cls, pretrained_model_name_or_path, processor_dict=None, **kwargs):
        args = []
        processor_dict = processor_dict if processor_dict is not None else {}
        subfolder = kwargs.pop("subfolder", "")

        sub_processors = cls.get_attributes()
        for sub_processor_type in sub_processors:
            modality = _get_modality_for_attribute(sub_processor_type)
            is_primary = sub_processor_type == modality

            if "tokenizer" in sub_processor_type:
                if "PixtralProcessor" in cls.__name__:
                    from transformers.tokenization_utils_tokenizers import TokenizersBackend
                    tokenizer = TokenizersBackend.from_pretrained(
                        pretrained_model_name_or_path, subfolder=subfolder, **kwargs
                    )
                else:
                    tokenizer = cls._load_tokenizer_from_pretrained(
                        sub_processor_type, pretrained_model_name_or_path, subfolder=subfolder, **kwargs
                    )
                args.append(tokenizer)
            elif is_primary:
                # Use [] not .get() — the lazy mapping needs __getitem__
                try:
                    auto_cls = MODALITY_TO_AUTOPROCESSOR_MAPPING[sub_processor_type]
                except (KeyError, ImportError):
                    # video_processor's AutoVideoProcessor has @requires(torchvision)
                    logger.info(f"⏭️  Skipping {sub_processor_type} (missing backend)")
                    args.append(None)
                    continue

                try:
                    sub_proc = auto_cls.from_pretrained(
                        pretrained_model_name_or_path, subfolder=subfolder, **kwargs
                    )
                except (ImportError, TypeError) as e:
                    # For image_processor: retry with slow (non-torchvision) backend
                    if "image" in sub_processor_type:
                        try:
                            fallback_kwargs = {k: v for k, v in kwargs.items()}
                            fallback_kwargs["use_fast"] = False
                            sub_proc = auto_cls.from_pretrained(
                                pretrained_model_name_or_path, subfolder=subfolder, **fallback_kwargs
                            )
                        except Exception:
                            sub_proc = None
                    else:
                        logger.info(f"⏭️  Skipping {sub_processor_type}: {e}")
                        sub_proc = None
                args.append(sub_proc)
            elif sub_processor_type in processor_dict:
                sub_config = processor_dict[sub_processor_type]
                if isinstance(sub_config, dict):
                    type_key = f"{modality}_type"
                    class_name = sub_config.get(type_key)
                    if class_name is None:
                        args.append(None)
                        continue
                    try:
                        proc_class = cls.get_possibly_dynamic_module(class_name)
                        args.append(proc_class(**sub_config))
                    except (ImportError, TypeError):
                        args.append(None)
                else:
                    args.append(None)
            else:
                args.append(None)
        return args

    processing_utils.ProcessorMixin._get_arguments_from_pretrained = _safe_get_args

    logger.info("✅ transformers patched for MLX Qwen3-VL (no torchvision)")


apply()
