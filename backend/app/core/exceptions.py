from fastapi import HTTPException, status


class ShopMindException(Exception):
    """Base exception for all ShopMind domain errors."""
    def __init__(self, message: str, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class InsufficientDataError(ShopMindException):
    def __init__(self, product_id: str, days_available: int, days_required: int):
        super().__init__(
            message=f"Product {product_id} has only {days_available} days of history. Minimum {days_required} required.",
            error_code="INSUFFICIENT_DATA",
        )


class ProductNotFoundError(ShopMindException):
    def __init__(self, product_id: str):
        super().__init__(
            message=f"Product {product_id} not found.",
            error_code="PRODUCT_NOT_FOUND",
        )


class PredictionNotFoundError(ShopMindException):
    def __init__(self, request_id: str):
        super().__init__(
            message=f"Prediction {request_id} not found.",
            error_code="PREDICTION_NOT_FOUND",
        )


class ShopNotFoundError(ShopMindException):
    def __init__(self, shop_id: str):
        super().__init__(
            message=f"Shop {shop_id} not found.",
            error_code="SHOP_NOT_FOUND",
        )


class GeminiUnavailableError(ShopMindException):
    def __init__(self):
        super().__init__(
            message="Gemini AI service is temporarily unavailable. Returning ML forecast only.",
            error_code="GEMINI_UNAVAILABLE",
        )


class ModelNotTrainedError(ShopMindException):
    def __init__(self, product_id: str):
        super().__init__(
            message=f"No trained model found for product {product_id}. Using fallback.",
            error_code="MODEL_NOT_TRAINED",
        )


def to_http_exception(exc: ShopMindException) -> HTTPException:
    status_map = {
        "PRODUCT_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "PREDICTION_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "SHOP_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "INSUFFICIENT_DATA": status.HTTP_422_UNPROCESSABLE_ENTITY,
    }
    return HTTPException(
        status_code=status_map.get(exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR),
        detail={"error_code": exc.error_code, "message": exc.message},
    )
