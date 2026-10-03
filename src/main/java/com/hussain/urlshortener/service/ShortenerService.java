package com.hussain.urlshortener.service;

import com.hussain.urlshortener.error.ResourceNotFoundException;
import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.validator.routines.UrlValidator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;

@Service
@RequiredArgsConstructor
public class ShortenerService {
    private static final UrlValidator URL_VALIDATOR = new UrlValidator(
            new String[]{"http", "https"},
            UrlValidator.ALLOW_LOCAL_URLS);

    private final UrlRepository urlRepository;

    public URI expand(final Long id) {
        return urlRepository.findById(id)
                .map(Url::getOriginalUrl)
                .map(URI::create)
                .orElseThrow(ResourceNotFoundException::new);
    }

    public Url shorten(final Url url) {
        if (url == null || !URL_VALIDATOR.isValid(url.getOriginalUrl())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Malformed URL");
        }
        try {
            return urlRepository.save(url);
        } catch (DataIntegrityViolationException e) {
            return urlRepository.findByOriginalUrl(url.getOriginalUrl())
                    .orElseThrow();
        }
    }
}
