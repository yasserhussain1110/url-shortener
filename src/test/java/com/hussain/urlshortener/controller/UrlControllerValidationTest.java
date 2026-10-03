package com.hussain.urlshortener.controller;

import com.hussain.urlshortener.error.GlobalExceptionHandler;
import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import com.hussain.urlshortener.service.ShortenerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UrlController.class)
@Import({ShortenerService.class, GlobalExceptionHandler.class})
class UrlControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UrlRepository urlRepository;

    @Test
    void rejectsMalformedUrl() throws Exception {
        mockMvc.perform(post("/shorten")
                        .contentType(APPLICATION_JSON)
                        .content("{\"original_url\":\"not a url\"}"))
                .andExpect(status().isBadRequest());

        verify(urlRepository, never()).save(any());
    }

    @Test
    void rejectsMissingUrl() throws Exception {
        mockMvc.perform(post("/shorten")
                        .contentType(APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        verify(urlRepository, never()).save(any());
    }

    @Test
    void acceptsWellFormedUrl() throws Exception {
        when(urlRepository.save(any(Url.class))).thenAnswer(invocation -> {
            Url saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        mockMvc.perform(post("/shorten")
                        .contentType(APPLICATION_JSON)
                        .content("{\"original_url\":\"https://example.com/docs\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.original_url").value("https://example.com/docs"));
    }
}
